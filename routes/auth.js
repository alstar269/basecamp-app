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

// 교사 회원가입 (교회 자동 승인)
router.post('/teacher/signup', async (req, res) => {
  try {
    const parsed = teacherSignup.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'invalid', details: parsed.error.flatten() })
    const { email, password, name, churchName } = parsed.data

    const teachers = collection('teachers')
    const existing = await teachers.findBy('email', email)
    if (existing) return res.status(409).json({ error: 'email_exists' })

    const churches = collection('churches')
    let church = await churches.findBy('name', churchName)
    if (!church) {
      church = await churches.create({ name: churchName, status: 'approved', approvedAt: new Date().toISOString() })
    }

    const passwordHash = await bcrypt.hash(password, 6)
    const teacher = await teachers.create({ email, passwordHash, name, churchId: church.id, status: 'active' })
    const token = signTeacher(teacher)
    return res.json({ token, teacher: { id: teacher.id, email, name, churchId: church.id, churchStatus: church.status } })
  } catch (err) {
    console.error('[signup] ERROR', err?.message)
    return res.status(500).json({ error: 'signup_failed' })
  }
})

router.post('/teacher/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'invalid' })
  const { email, password } = parsed.data
  const t = await collection('teachers').findBy('email', email)
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
  const a = await collection('admins').findBy('email', email)
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
