// 관리자: 교회 승인, 전체 통계, 수동 보존 스윕
import express from 'express'
import { collection } from '../lib/storage.js'
import { require_ } from '../lib/auth.js'
import { MENTORS } from '../lib/mentors.js'
import { runRetentionSweep } from '../lib/retention.js'

const router = express.Router()

router.get('/churches', require_('admin'), async (req, res) => {
  const churches = await collection('churches').list()
  return res.json(churches.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)))
})

router.post('/churches/:id/approve', require_('admin'), async (req, res) => {
  const updated = await collection('churches').update(req.params.id, { status: 'approved', approvedAt: Date.now() })
  if (!updated) return res.status(404).json({ error: 'not_found' })
  return res.json(updated)
})

router.post('/churches/:id/reject', require_('admin'), async (req, res) => {
  const updated = await collection('churches').update(req.params.id, { status: 'rejected' })
  if (!updated) return res.status(404).json({ error: 'not_found' })
  return res.json(updated)
})

// 관리자: 전체 수련회 목록 (교사·교회·학생 수 포함)
router.get('/retreats', require_('admin'), async (req, res) => {
  const [retreats, teachers, churches, students, codes] = await Promise.all([
    collection('retreats').list(),
    collection('teachers').list(),
    collection('churches').list(),
    collection('students').list(),
    collection('codes').list()
  ])
  const teacherById = Object.fromEntries(teachers.map((t) => [t.id, t]))
  const churchById = Object.fromEntries(churches.map((c) => [c.id, c]))
  const studentsByRetreat = students.reduce((acc, s) => {
    acc[s.retreatId] = (acc[s.retreatId] || 0) + 1
    return acc
  }, {})
  const codeByRetreat = {}
  for (const c of codes) if (!c.revoked) codeByRetreat[c.retreatId] = c

  return res.json(
    retreats
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      .map((r) => ({
        ...r,
        teacherEmail: teacherById[r.teacherId]?.email || null,
        teacherName: teacherById[r.teacherId]?.name || null,
        churchName: churchById[r.churchId]?.name || null,
        studentCount: studentsByRetreat[r.id] || 0,
        inviteCode: codeByRetreat[r.id]?.code || null
      }))
  )
})

// 관리자: 모든 수련회 삭제 가능
router.delete('/retreats/:id', require_('admin'), async (req, res) => {
  const retreat = await collection('retreats').get(req.params.id)
  if (!retreat) return res.status(404).json({ error: 'not_found' })
  const ok = await collection('retreats').delete(req.params.id)
  return res.json({ ok, deleted: retreat.title })
})

// 관리자: 여러 수련회 일괄 삭제
router.post('/retreats/bulk-delete', require_('admin'), async (req, res) => {
  const { ids } = req.body || {}
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'no_ids' })
  const results = []
  for (const id of ids) {
    try {
      const retreat = await collection('retreats').get(id)
      if (!retreat) { results.push({ id, ok: false, reason: 'not_found' }); continue }
      await collection('retreats').delete(id)
      results.push({ id, ok: true, title: retreat.title })
    } catch (e) {
      results.push({ id, ok: false, reason: e.message })
    }
  }
  return res.json({ results, deleted: results.filter((r) => r.ok).length })
})

// 관리자: 교회 삭제 (소속 교사·수련회·모든 데이터 cascade)
router.delete('/churches/:id', require_('admin'), async (req, res) => {
  const church = await collection('churches').get(req.params.id)
  if (!church) return res.status(404).json({ error: 'not_found' })
  const ok = await collection('churches').delete(req.params.id)
  return res.json({ ok, deleted: church.name })
})

router.get('/stats', require_('admin'), async (req, res) => {
  const [churches, retreats, teachers, students, conversations, messages, insights, alerts] = await Promise.all([
    collection('churches').list(),
    collection('retreats').list(),
    collection('teachers').list(),
    collection('students').list(),
    collection('conversations').list(),
    collection('messages').list(),
    collection('insights').list(),
    collection('crisis-alerts').list()
  ])
  return res.json({
    churches: churches.length,
    churchesPending: churches.filter((c) => c.status === 'pending').length,
    retreats: retreats.length,
    retreatsActive: retreats.filter((r) => r.status === 'active').length,
    teachers: teachers.length,
    students: students.length,
    conversations: conversations.length,
    messages: messages.length,
    insights: insights.length,
    crisisAlerts: alerts.length
  })
})

router.get('/mentors', require_('admin'), (req, res) => {
  res.json(MENTORS)
})

router.post('/retention/run', require_('admin'), async (req, res) => {
  const purged = await runRetentionSweep()
  res.json({ purged })
})

export default router
