import { Router } from 'express';
import { SessionStore } from '../services/db.js';

const router = Router();
const store = new SessionStore();

// POST /api/sessions — Create a new simulation session
router.post('/', (req, res) => {
  const { metadata = {} } = req.body;
  const session = store.create(metadata);
  res.status(201).json(session);
});

// GET /api/sessions — List all saved sessions
router.get('/', (req, res) => {
  const sessions = store.listAll();
  res.json(sessions);
});

// GET /api/sessions/:id — Get a session with all its frames
router.get('/:id', (req, res) => {
  const session = store.getById(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  res.json(session);
});

// POST /api/sessions/:id/frames — Append data frames to a session
router.post('/:id/frames', (req, res) => {
  const { frames } = req.body;
  if (!Array.isArray(frames)) {
    return res.status(400).json({ error: 'frames must be an array' });
  }

  const session = store.getById(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  store.addFrames(req.params.id, frames);
  res.json({ added: frames.length, totalFrames: session.frames.length + frames.length });
});

// GET /api/sessions/:id/export — Download session data as CSV
router.get('/:id/export', (req, res) => {
  const session = store.getById(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const headers = 'Timestamp,Hour,RoomTempF,OutdoorTempF,Humidity,HVAC_Power,Q_Solar,Q_Occupancy,Q_Envelope,Q_Latent,Q_Decay,Cost,Carbon\n';
  const rows = session.frames.map(f =>
    [f.timestamp, f.hour, f.roomTempF, f.outdoorTempF, f.humidity,
     f.hvacPower, f.qSolar, f.qOccupancy, f.qEnvelope, f.qLatent,
     f.qDecay, f.cost, f.carbon].join(',')
  ).join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=session_${req.params.id}.csv`);
  res.send(headers + rows);
});

// DELETE /api/sessions/:id — Delete a session
router.delete('/:id', (req, res) => {
  const deleted = store.delete(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Session not found' });
  res.json({ deleted: true });
});

export default router;
