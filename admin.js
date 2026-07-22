const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../db/client');
const { requireAdmin } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/rateLimit');
const { isNonEmptyString, toIntOrNull } = require('../utils/validate');

const router = express.Router();

const SESSION_LENGTH = '24h'; // spec: admin session expires after 24 hours

// POST /api/admin/login  { password }
router.post('/login', loginLimiter, async (req, res) => {
  const { password } = req.body;
  if (!isNonEmptyString(password, 200)) {
    return res.status(400).json({ error: 'Password is required' });
  }

  try {
    const result = await db.execute('SELECT id, password_hash FROM admin WHERE id = 1');
    if (result.rows.length === 0) {
      return res.status(500).json({ error: 'Admin account is not set up — run the seed script' });
    }
    const match = await bcrypt.compare(password, result.rows[0].password_hash);
    if (!match) return res.status(401).json({ error: 'Incorrect password' });

    const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { expiresIn: SESSION_LENGTH });
    res.json({ token });
  } catch (err) {
    console.error('POST /admin/login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/admin/verify — lets the frontend silently check a stored token is still valid
router.get('/verify', requireAdmin, (req, res) => {
  res.json({ valid: true });
});

// POST /api/admin/change-password  { currentPassword, newPassword }
router.post('/change-password', requireAdmin, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!isNonEmptyString(currentPassword, 200) || !isNonEmptyString(newPassword, 200)) {
    return res.status(400).json({ error: 'currentPassword and newPassword are required' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }

  try {
    const result = await db.execute('SELECT password_hash FROM admin WHERE id = 1');
    if (result.rows.length === 0) return res.status(500).json({ error: 'Admin account is not set up' });

    const match = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    if (!match) return res.status(401).json({ error: 'Current password is incorrect' });

    const newHash = await bcrypt.hash(newPassword, 12);
    await db.execute({ sql: 'UPDATE admin SET password_hash = ? WHERE id = 1', args: [newHash] });
    res.json({ success: true });
  } catch (err) {
    console.error('POST /admin/change-password error:', err);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// ---- Comment moderation (section H of the admin panel) ----

// GET /api/admin/comments — all comments, grouped by episode
router.get('/comments', requireAdmin, async (req, res) => {
  try {
    const result = await db.execute(`
      SELECT c.id, c.episode_id, c.nickname, c.body, c.created_at, e.title AS episode_title
      FROM comments c
      LEFT JOIN episodes e ON e.id = c.episode_id
      ORDER BY e.title, c.created_at DESC
    `);
    const grouped = {};
    for (const row of result.rows) {
      const key = row.episode_title || `Episode #${row.episode_id}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(row);
    }
    res.json(grouped);
  } catch (err) {
    console.error('GET /admin/comments error:', err);
    res.status(500).json({ error: 'Failed to load comments' });
  }
});

// DELETE /api/admin/comments/:id
router.delete('/comments/:id', requireAdmin, async (req, res) => {
  const id = toIntOrNull(req.params.id);
  if (id === null) return res.status(400).json({ error: 'Invalid id' });
  try {
    const result = await db.execute({ sql: 'DELETE FROM comments WHERE id = ?', args: [id] });
    if (result.rowsAffected === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /admin/comments/:id error:', err);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

module.exports = router;
