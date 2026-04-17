// 교사 대시보드용 익명 집계 API
import express from 'express'
import { collection } from '../lib/storage.js'
import { require_ } from '../lib/auth.js'
import { aggregateRetreatInsights } from '../lib/anonymize.js'

const router = express.Router()

router.get('/dashboard/:retreatId', require_('teacher'), async (req, res) => {
  const retreat = await collection('retreats').get(req.params.retreatId)
  if (!retreat) return res.status(404).json({ error: 'not_found' })
  if (retreat.teacherId !== req.auth.sub) return res.status(403).json({ error: 'forbidden' })
  const agg = await aggregateRetreatInsights(retreat.id)
  return res.json({ retreat, insights: agg })
})

export default router
