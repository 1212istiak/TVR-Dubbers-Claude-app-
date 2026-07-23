const express = require('express');
const { db } = require('../db/client');
const { requireAdmin } = require('../middleware/auth');
const { isNonEmptyString, toIntOrNull } = require('../utils/validate');

const router = express.Router();

// GET /api/voice-artists
router.get('/', async (req, res) => {
  try {
    const result = await db.execute(
      'SELECT id, name, display_order FROM voice_artists ORDER BY display_order ASC, id ASC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('GET /voice-artists error:', err);
    res.status(500).json({ error: 'Failed to load voice artists' });
  }
});

// POST /api/admin/voice-artists  { name }
router.post('/', requireAdmin, async (req, res) => {
  const { name } = req.body;
  if (!isNonEmptyString(name, 100)) {
    return res.status(400).json({ error: 'name is required (max 100 chars)' });
  }
  try {
    const countResult = await db.execute('SELECT COUNT(*) as c FROM voice_artists');
    const nextOrder = Number(countResult.rows[0].c);
    const result = await db.execute({
      sql: 'INSERT INTO voice_artists (name, display_order) VALUES (?, ?)',
      args: [name.trim(), nextOrder],
    });
    res.status(201).json({ id: Number(result.lastInsertRowid), name: name.trim(), display_order: nextOrder });
  } catch (err) {
    console.error('POST /admin/voice-artists error:', err);
    res.status(500).json({ error: 'Failed to add voice artist' });
  }
});

// DELETE /api/admin/voice-artists/:id
router.delete('/:id', requireAdmin, async (req, res) => {
  const id = toIntOrNull(req.params.id);
  if (id === null) return res.status(400).json({ error: 'Invalid id' });
  try {
    const result = await db.execute({ sql: 'DELETE FROM voice_artists WHERE id = ?', args: [id] });
    if (result.rowsAffected === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /admin/voice-artists/:id error:', err);
    res.status(500).json({ error: 'Failed to delete voice artist' });
  }
});

// PUT /api/admin/voice-artists/reorder  { order: [id1, id2, id3, ...] }
router.put('/reorder', requireAdmin, async (req, res) => {
  const { order } = req.body;
  if (!Array.isArray(order) || order.some((id) => toIntOrNull(id) === null)) {
    return res.status(400).json({ error: 'order must be an array of ids' });
  }
  try {
    for (let i = 0; i < order.length; i++) {
      await db.execute({
        sql: 'UPDATE voice_artists SET display_order = ? WHERE id = ?',
        args: [i, toIntOrNull(order[i])],
      });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('PUT /admin/voice-artists/reorder error:', err);
    res.status(500).json({ error: 'Failed to reorder' });
  }
});

module.exports = router;
