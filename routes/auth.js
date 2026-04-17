// 교사·관리자 로그인/가입
import express from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { collection } from '../lib/storage.js'
import { signTeacher, signAdmin, require_ } from '../lib/auth.js'

const router = express.Router()

const teacherSignup = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(50),
  churchName: z.string().min(1).max(100)
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
})

// 교사 회원가입 (교회는 pending 상태로 생성, 관리자 승인 필요)
router.post('/teacher/signup', async (req, res) => {
  const parsed = teacherSignup.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'invalid', details: parsed.error.flatten() })
  const { email, password, name, churchName } = parsed.data

  const teachers = collection('teachers')
  const exists = await teachers.list((t) => t.email === email)
  if (exists.length > 0) return res.status(409).json({ error: 'email_exists' })

  const churches = collection('churches')
  let church = (await churches.list((c) => c.name === churchName))[0]
  if (!church) {
    church = await churches.create({ name: churchName, status: 'pending' })
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const teacher = await teachers.create({ email, passwordHash, name, churchId: church.id, status: 'active' })
  const token = signTeacher(teacher)
  return res.json({ token, teacher: { id: teacher.id, email, name, churchId: church.id, churchStatus: church.status } })
})

router.post('/teacher/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'invalid' })
  const { email, password } = parsed.data
  const teachers = collection('teachers')
  const t = (await teachers.list((x) => x.email === email))[0]
  if (!t) return res.status(401).json({ error: 'invalid_credentials' })
  const ok = await bcrypt.compare(password, t.passwordHash)
  if (!ok) return res.status(401).json({ error: 'invalid_credentials' })
  const token = signTeacher(t)
  const church = await collection('churches').get(t.churchId)
  return res.json({ token, teacher: { id: t.id, email: t.email, name: t.name, churchId: t.churchId, churchStatus: church?.status } })
})

router.post('/admin/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'invalid' })
  const { email, password } = parsed.data
  const admins = collection('admins')
  const a = (await admins.list((x) => x.email === email))[0]
  if (!a) return res.status(401).json({ error: 'invalid_credentials' })
  const ok = await bcrypt.compare(password, a.passwordHash)
  if (!ok) return res.status(401).json({ error: 'invalid_credentials' })
  const token = signAdmin(a)
  return res.json({ token, admin: { id: a.id, email: a.email, role: a.role } })
})

router.get('/teacher/me', require_('teacher'), async (req, res) => {
  const t = await collection('teachers').get(req.auth.sub)
  if (!t) return res.status(404).json({ error: 'not_found' })
  const church = await collection('churches').get(t.churchId)
  return res.json({ id: t.id, email: t.email, name: t.name, churchId: t.churchId, churchName: church?.name, churchStatus: church?.status })
})

export default router
