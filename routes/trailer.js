const express = require('express');
const { db } = require('../db/client');
const { requireAdmin } = require('../middleware/auth');
const { normalizeEmbedUrl } = require('../utils/embedUrl');
const { isNonEmptyString, isValidImageUrl } = require('../utils/validate');

const router = express.Router();

function rowToTrailer(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    genre: row.genre,
    thumbnailUrl: row.thumbnail_url,
    primaryServerUrl: row.primary_server_url,
    backupServerUrl: row.backup_server_url,
  };
}

// GET /api/trailer
router.get('/', async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM trailer WHERE id = 1');
    res.json(rowToTrailer(result.rows[0]));
  } catch (err) {
    console.error('GET /trailer error:', err);
    res.status(500).json({ error: 'Failed to load trailer' });
  }
});

// POST /api/admin/trailer  (upsert — there's only ever one trailer, id = 1)
router.post('/', requireAdmin, async (req, res) => {
  const { title, genre, thumbnailUrl, primaryServerUrl, backupServerUrl } = req.body;
  const errors = [];

  if (!isNonEmptyString(title, 200)) errors.push('title is required');
  if (!isValidImageUrl(thumbnailUrl)) errors.push('thumbnailUrl must be a valid URL');

  const primary = normalizeEmbedUrl(primaryServerUrl, 'dailymotion');
  if (!primary.ok) errors.push(`primaryServerUrl: ${primary.error}`);

  let backupUrl = null;
  if (backupServerUrl) {
    const backup = normalizeEmbedUrl(backupServerUrl, 'rumble');
    if (!backup.ok) errors.push(`backupServerUrl: ${backup.error}`);
    else backupUrl = backup.url;
  }

  if (errors.length) return res.status(400).json({ error: errors.join('; ') });

  try {
    await db.execute({
      sql: `INSERT INTO trailer (id, title, genre, thumbnail_url, primary_server_url, backup_server_url)
            VALUES (1, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              title = excluded.title,
              genre = excluded.genre,
              thumbnail_url = excluded.thumbnail_url,
              primary_server_url = excluded.primary_server_url,
              backup_server_url = excluded.backup_server_url`,
      args: [title.trim(), genre?.trim() || null, thumbnailUrl.trim(), primary.url, backupUrl],
    });
    const result = await db.execute('SELECT * FROM trailer WHERE id = 1');
    res.json(rowToTrailer(result.rows[0]));
  } catch (err) {
    console.error('POST /admin/trailer error:', err);
    res.status(500).json({ error: 'Failed to save trailer' });
  }
});

module.exports = router;
