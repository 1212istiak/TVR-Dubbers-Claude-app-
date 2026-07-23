const express = require('express');
const { db } = require('../db/client');
const { toIntOrNull, isNonEmptyString } = require('../utils/validate');

const router = express.Router();

const VALID_TYPES = ['heart', 'fire', 'laugh', 'cry']; // ❤ 🔥 🤣 😢

// GET /api/reactions/:episodeId — counts per type + which one this visitor already picked
router.get('/:episodeId', async (req, res) => {
  const episodeId = toIntOrNull(req.params.episodeId);
  if (episodeId === null) return res.status(400).json({ error: 'Invalid episode id' });
  const visitorId = req.query.visitorId;

  try {
    const counts = await db.execute({
      sql: 'SELECT reaction_type, COUNT(*) as c FROM reactions WHERE episode_id = ? GROUP BY reaction_type',
      args: [episodeId],
    });
    const tally = { heart: 0, fire: 0, laugh: 0, cry: 0 };
    for (const row of counts.rows) tally[row.reaction_type] = Number(row.c);

    let yourReaction = null;
    if (visitorId) {
      const mine = await db.execute({
        sql: 'SELECT reaction_type FROM reactions WHERE episode_id = ? AND visitor_id = ?',
        args: [episodeId, visitorId],
      });
      if (mine.rows.length) yourReaction = mine.rows[0].reaction_type;
    }

    res.json({ counts: tally, yourReaction });
  } catch (err) {
    console.error('GET /reactions/:episodeId error:', err);
    res.status(500).json({ error: 'Failed to load reactions' });
  }
});

// POST /api/reactions/:episodeId  { visitorId, reactionType }
// One reaction per visitor per episode — re-tapping the same or a different
// reaction just replaces the visitor's previous pick (UNIQUE(episode_id, visitor_id)).
router.post('/:episodeId', async (req, res) => {
  const episodeId = toIntOrNull(req.params.episodeId);
  if (episodeId === null) return res.status(400).json({ error: 'Invalid episode id' });

  const { visitorId, reactionType } = req.body;
  if (!isNonEmptyString(visitorId, 100)) return res.status(400).json({ error: 'visitorId is required' });
  if (!VALID_TYPES.includes(reactionType)) return res.status(400).json({ error: 'Invalid reactionType' });

  try {
    const episode = await db.execute({ sql: 'SELECT id FROM episodes WHERE id = ?', args: [episodeId] });
    if (episode.rows.length === 0) return res.status(404).json({ error: 'Episode not found' });

    await db.execute({
      sql: `INSERT INTO reactions (episode_id, visitor_id, reaction_type) VALUES (?, ?, ?)
            ON CONFLICT(episode_id, visitor_id) DO UPDATE SET reaction_type = excluded.reaction_type`,
      args: [episodeId, visitorId, reactionType],
    });

    const counts = await db.execute({
      sql: 'SELECT reaction_type, COUNT(*) as c FROM reactions WHERE episode_id = ? GROUP BY reaction_type',
      args: [episodeId],
    });
    const tally = { heart: 0, fire: 0, laugh: 0, cry: 0 };
    for (const row of counts.rows) tally[row.reaction_type] = Number(row.c);

    res.json({ counts: tally, yourReaction: reactionType });
  } catch (err) {
    console.error('POST /reactions/:episodeId error:', err);
    res.status(500).json({ error: 'Failed to save reaction' });
  }
});

module.exports = router;
