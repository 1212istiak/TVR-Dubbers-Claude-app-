const express = require('express');
const { db } = require('../db/client');
const { requireAdmin } = require('../middleware/auth');
const { cleanText } = require('../utils/validate');

const router = express.Router();

const ALLOWED_KEYS = [
  'website_title',
  'motto',
  'special_folder_thumbnail',
  'special_folder_label',
  'countdown_target_date',
  'facebook',
  'youtube',
  'telegram',
  'whatsapp',
  'instagram',
  'dailymotion',
  'rumble',
];

// GET /api/settings — returns all settings as a flat { key: value } object.
// Public route: visitors need this to render the header title, footer links, countdown, etc.
router.get('/', async (req, res) => {
  try {
    const result = await db.execute('SELECT key, value FROM settings');
    const settings = {};
    for (const row of result.rows) settings[row.key] = row.value;
    res.json(settings);
  } catch (err) {
    console.error('GET /settings error:', err);
    res.status(500).json({ error: 'Failed to load settings' });
  }
});

// PUT /api/admin/settings — body: { key: value, ... } for any subset of ALLOWED_KEYS
router.put('/', requireAdmin, async (req, res) => {
  const updates = Object.entries(req.body).filter(([key]) => ALLOWED_KEYS.includes(key));
  if (updates.length === 0) {
    return res.status(400).json({ error: 'No valid setting keys provided' });
  }

  try {
    for (const [key, value] of updates) {
      await db.execute({
        sql: `INSERT INTO settings (key, value) VALUES (?, ?)
              ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        args: [key, value === null || value === undefined ? null : cleanText(String(value), 2000)],
      });
    }
    const result = await db.execute('SELECT key, value FROM settings');
    const settings = {};
    for (const row of result.rows) settings[row.key] = row.value;
    res.json(settings);
  } catch (err) {
    console.error('PUT /admin/settings error:', err);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

module.exports = router;
