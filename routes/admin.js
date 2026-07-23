const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../db/client');
const { requireAdmin } = require('../middleware/auth');
const { isNonEmptyString, toIntOrNull } = require('../utils/validate');
// Note: requireAdmin checks req.body.password on POST/PUT/DELETE requests.
// For GET requests we check password from query string manually.

const router = express.Router();

// POST /api/admin/auth  { password }
// Simple auth check — just verifies the password is correct. No token returned.
router.post('/auth', async (req, res) => {
  const { password } = req.body;
  if (!isNonEmptyString(password, 200)) {
    return res.status(400).json({ error: 'Password is required' });
  }
  try {
    const result = await db.execute('SELECT password_hash FROM admin WHERE id = 1');
    if (result.rows.length === 0) {
      return res.status(500).json({ error: 'Admin account not set up \u2014 run the seed script' });
    }
    const match = await bcrypt.compare(password, result.rows[0].password_hash);
    if (!match) return res.status(401).json({ error: 'Wrong password' });
    res.json({ success: true });
  } catch (err) {
    console.error('POST /admin/auth error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/admin/password  { password, new_password }
// Change admin password. Requires current password in body.
router.post('/password', async (req, res) => {
  const { password, new_password } = req.body;
  if (!isNonEmptyString(password, 200) || !isNonEmptyString(new_password, 200)) {
    return res.status(400).json({ error: 'password and new_password are required' });
  }
  if (new_password.length < 4) {
    return res.status(400).json({ error: 'New password must be at least 4 characters' });
  }
  try {
    const result = await db.execute('SELECT password_hash FROM admin WHERE id = 1');
    if (result.rows.length === 0) return res.status(500).json({ error: 'Admin account not set up' });
    const match = await bcrypt.compare(password, result.rows[0].password_hash);
    if (!match) return res.status(401).json({ error: 'Current password is incorrect' });
    const newHash = await bcrypt.hash(new_password, 12);
    await db.execute({ sql: 'UPDATE admin SET password_hash = ? WHERE id = 1', args: [newHash] });
    res.json({ success: true });
  } catch (err) {
    console.error('POST /admin/password error:', err);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// ---- Comment moderation (section H of the admin panel) ----

// GET /api/admin/comments?password=xxx — all comments, grouped by episode
router.get('/comments', async (req, res) => {
  // For GET requests, password comes from query string
  const password = req.query.password;
  if (!password) return res.status(401).json({ error: 'Password is required' });
  try {
    const adminRow = await db.execute('SELECT password_hash FROM admin WHERE id = 1');
    if (adminRow.rows.length === 0) return res.status(500).json({ error: 'Admin not set up' });
    const bcrypt = require('bcryptjs');
    const match = await bcrypt.compare(password, adminRow.rows[0].password_hash);
    if (!match) return res.status(401).json({ error: 'Wrong password' });
  } catch (err) {
    return res.status(500).json({ error: 'Auth failed' });
  }
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
