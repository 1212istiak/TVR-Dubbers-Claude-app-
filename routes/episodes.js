const express = require('express');
const { db } = require('../db/client');
const { requireAdmin } = require('../middleware/auth');
const { normalizeEmbedUrl } = require('../utils/embedUrl');
const { isNonEmptyString, isValidImageUrl, toIntOrNull } = require('../utils/validate');

const router = express.Router();

function rowToEpisode(row) {
  return {
    id: row.id,
    title: row.title,
    episodeNumber: row.episode_number,
    season: row.season,
    genre: row.genre,
    thumbnailUrl: row.thumbnail_url,
    primaryServerUrl: row.primary_server_url,
    backupServerUrl: row.backup_server_url,
    isSpecial: !!row.is_special,
    createdAt: row.created_at,
    viewCount: row.view_count,
  };
}

// GET /api/episodes?genre=Action&special=1&q=search
router.get('/', async (req, res) => {
  try {
    const { genre, special, q } = req.query;
    let sql = 'SELECT * FROM episodes WHERE 1=1';
    const args = [];

    if (genre) {
      sql += ' AND genre = ?';
      args.push(genre);
    }
    if (special === '1' || special === 'true') {
      sql += ' AND is_special = 1';
    }
    if (q) {
      sql += ' AND title LIKE ?';
      args.push(`%${q}%`);
    }
    sql += ' ORDER BY created_at DESC, id DESC';

    const result = await db.execute({ sql, args });
    res.json(result.rows.map(rowToEpisode));
  } catch (err) {
    console.error('GET /episodes error:', err);
    res.status(500).json({ error: 'Failed to load episodes' });
  }
});

// GET /api/episodes/:id  (also bumps view_count)
router.get('/:id', async (req, res) => {
  try {
    const id = toIntOrNull(req.params.id);
    if (id === null) return res.status(400).json({ error: 'Invalid episode id' });

    const result = await db.execute({ sql: 'SELECT * FROM episodes WHERE id = ?', args: [id] });
    if (result.rows.length === 0) return res.status(404).json({ error: 'Episode not found' });

    await db.execute({
      sql: 'UPDATE episodes SET view_count = view_count + 1 WHERE id = ?',
      args: [id],
    });

    const episode = rowToEpisode(result.rows[0]);
    episode.viewCount += 1;
    res.json(episode);
  } catch (err) {
    console.error('GET /episodes/:id error:', err);
    res.status(500).json({ error: 'Failed to load episode' });
  }
});

function validateEpisodePayload(body, { partial = false } = {}) {
  const errors = [];
  const clean = {};

  if (!partial || body.title !== undefined) {
    if (!isNonEmptyString(body.title, 200)) errors.push('title is required (max 200 chars)');
    clean.title = body.title?.trim();
  }
  if (!partial || body.episodeNumber !== undefined) {
    const n = toIntOrNull(body.episodeNumber);
    if (n === null) errors.push('episodeNumber must be an integer');
    clean.episode_number = n;
  }
  if (body.season !== undefined) {
    const n = toIntOrNull(body.season);
    clean.season = n === null ? 1 : n;
  } else if (!partial) {
    clean.season = 1;
  }
  if (body.genre !== undefined) {
    clean.genre = isNonEmptyString(body.genre, 50) ? body.genre.trim() : null;
  } else if (!partial) {
    clean.genre = null;
  }
  if (!partial || body.thumbnailUrl !== undefined) {
    if (!isValidImageUrl(body.thumbnailUrl)) errors.push('thumbnailUrl must be a valid URL');
    clean.thumbnail_url = body.thumbnailUrl?.trim();
  }
  if (!partial || body.primaryServerUrl !== undefined) {
    const result = normalizeEmbedUrl(body.primaryServerUrl, 'dailymotion');
    if (!result.ok) errors.push(`primaryServerUrl: ${result.error}`);
    else clean.primary_server_url = result.url;
  }
  if (body.backupServerUrl !== undefined && body.backupServerUrl !== '') {
    const result = normalizeEmbedUrl(body.backupServerUrl, 'rumble');
    if (!result.ok) errors.push(`backupServerUrl: ${result.error}`);
    else clean.backup_server_url = result.url;
  } else if (!partial) {
    clean.backup_server_url = null;
  }
  if (body.isSpecial !== undefined) {
    clean.is_special = body.isSpecial ? 1 : 0;
  } else if (!partial) {
    clean.is_special = 0;
  }

  return { errors, clean };
}

// POST /api/admin/episodes
router.post('/', requireAdmin, async (req, res) => {
  const { errors, clean } = validateEpisodePayload(req.body);
  if (errors.length) return res.status(400).json({ error: errors.join('; ') });

  try {
    const result = await db.execute({
      sql: `INSERT INTO episodes
        (title, episode_number, season, genre, thumbnail_url, primary_server_url, backup_server_url, is_special)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        clean.title,
        clean.episode_number,
        clean.season,
        clean.genre,
        clean.thumbnail_url,
        clean.primary_server_url,
        clean.backup_server_url,
        clean.is_special,
      ],
    });
    const created = await db.execute({
      sql: 'SELECT * FROM episodes WHERE id = ?',
      args: [Number(result.lastInsertRowid)],
    });
    res.status(201).json(rowToEpisode(created.rows[0]));
  } catch (err) {
    console.error('POST /admin/episodes error:', err);
    res.status(500).json({ error: 'Failed to save episode' });
  }
});

// PUT /api/admin/episodes/:id
router.put('/:id', requireAdmin, async (req, res) => {
  const id = toIntOrNull(req.params.id);
  if (id === null) return res.status(400).json({ error: 'Invalid episode id' });

  const { errors, clean } = validateEpisodePayload(req.body, { partial: true });
  if (errors.length) return res.status(400).json({ error: errors.join('; ') });
  if (Object.keys(clean).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  try {
    const setClauses = Object.keys(clean).map((col) => `${col} = ?`);
    const args = [...Object.values(clean), id];
    await db.execute({
      sql: `UPDATE episodes SET ${setClauses.join(', ')} WHERE id = ?`,
      args,
    });
    const updated = await db.execute({ sql: 'SELECT * FROM episodes WHERE id = ?', args: [id] });
    if (updated.rows.length === 0) return res.status(404).json({ error: 'Episode not found' });
    res.json(rowToEpisode(updated.rows[0]));
  } catch (err) {
    console.error('PUT /admin/episodes/:id error:', err);
    res.status(500).json({ error: 'Failed to update episode' });
  }
});

// DELETE /api/admin/episodes/:id
router.delete('/:id', requireAdmin, async (req, res) => {
  const id = toIntOrNull(req.params.id);
  if (id === null) return res.status(400).json({ error: 'Invalid episode id' });

  try {
    const result = await db.execute({ sql: 'DELETE FROM episodes WHERE id = ?', args: [id] });
    if (result.rowsAffected === 0) return res.status(404).json({ error: 'Episode not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /admin/episodes/:id error:', err);
    res.status(500).json({ error: 'Failed to delete episode' });
  }
});

module.exports = router;
