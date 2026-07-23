const express = require('express');
const { db } = require('../db/client');
const { commentLimiter } = require('../middleware/rateLimit');
const { cleanText, toIntOrNull } = require('../utils/validate');

const router = express.Router();

// GET /api/comments/:episodeId — newest first
router.get('/:episodeId', async (req, res) => {
  const episodeId = toIntOrNull(req.params.episodeId);
  if (episodeId === null) return res.status(400).json({ error: 'Invalid episode id' });
  try {
    const result = await db.execute({
      sql: 'SELECT id, nickname, body, created_at FROM comments WHERE episode_id = ? ORDER BY created_at DESC, id DESC',
      args: [episodeId],
    });
    res.json(result.rows);
  } catch (err) {
    console.error('GET /comments/:episodeId error:', err);
    res.status(500).json({ error: 'Failed to load comments' });
  }
});

// POST /api/comments/:episodeId  { nickname?, body }
router.post('/:episodeId', commentLimiter, async (req, res) => {
  const episodeId = toIntOrNull(req.params.episodeId);
  if (episodeId === null) return res.status(400).json({ error: 'Invalid episode id' });

  const body = cleanText(req.body.body, 1000);
  if (!body) return res.status(400).json({ error: 'Comment body is required' });
  const nickname = cleanText(req.body.nickname, 60) || 'Anonymous';

  try {
    const episode = await db.execute({ sql: 'SELECT id FROM episodes WHERE id = ?', args: [episodeId] });
    if (episode.rows.length === 0) return res.status(404).json({ error: 'Episode not found' });

    const result = await db.execute({
      sql: 'INSERT INTO comments (episode_id, nickname, body) VALUES (?, ?, ?)',
      args: [episodeId, nickname, body],
    });
    const created = await db.execute({
      sql: 'SELECT id, nickname, body, created_at FROM comments WHERE id = ?',
      args: [Number(result.lastInsertRowid)],
    });
    res.status(201).json(created.rows[0]);
  } catch (err) {
    console.error('POST /comments/:episodeId error:', err);
    res.status(500).json({ error: 'Failed to post comment' });
  }
});

module.exports = router;
