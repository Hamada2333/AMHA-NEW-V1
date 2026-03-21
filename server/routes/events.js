// ─── EVENTS & AUDIT LOG API ───
import { Router } from 'express';
import eventStore from '../eventStore.js';
import asyncHandler from '../middleware/asyncHandler.js';
import cache from '../redis.js';
import eventBus from '../eventBus.js';

const router = Router();

// GET all events (paginated)
router.get('/', asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const [events, count] = await Promise.all([
    eventStore.getRecent(limit),
    eventStore.getCount(),
  ]);
  res.json({ events, total: count });
}));

// GET events by type
router.get('/type/:type', asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const offset = Number(req.query.offset) || 0;
  const events = await eventStore.getByType(req.params.type, limit, offset);
  res.json(events);
}));

// GET entity event history
router.get('/entity/:entityType/:entityId', asyncHandler(async (req, res) => {
  const events = await eventStore.getByEntity(req.params.entityType, req.params.entityId);
  res.json(events);
}));

// GET event statistics
router.get('/stats', asyncHandler(async (_req, res) => {
  const [count, byType] = await Promise.all([
    eventStore.getCount(),
    eventStore.getCountByType(),
  ]);
  const busMetrics = eventBus.getMetrics();
  const cacheStats = cache.getStats();

  res.json({
    totalEvents: count,
    byType,
    bus: busMetrics,
    cache: cacheStats,
  });
}));

// GET activity timeline (from memory layer)
router.get('/activity', asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const activity = await cache.getSystemActivity(limit);
  res.json(activity);
}));

// GET user-specific actions
router.get('/user/:userId/actions', asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const actions = await cache.getUserActions(req.params.userId, limit);
  res.json(actions);
}));

// GET processing state for a job
router.get('/job/:jobId', asyncHandler(async (req, res) => {
  const state = await cache.getProcessingState(req.params.jobId);
  if (!state) return res.status(404).json({ error: 'Job not found' });
  res.json(state);
}));

export default router;
