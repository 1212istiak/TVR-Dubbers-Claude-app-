const express = require('express');
const { db } = require('../db/client');
const { toIntOrNull } = require('../utils/validate');

const router = express.Router();

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// GET /share/episode/:id
// Social crawlers (Facebook/Telegram/Twitter) read the OG/Twitter tags below
// without running JS. Real visitors get redirected straight to the SPA with
// ?episode=<id> so main.js can auto-open that episode's modal on load.
router.get('/episode/:id', async (req, res) => {
  const id = toIntOrNull(req.params.id);
  const frontendUrl = (process.env.FRONTEND_URL || '').replace(/\/$/, '');

  if (id === null) return res.redirect(frontendUrl || '/');

  try {
    const result = await db.execute({ sql: 'SELECT * FROM episodes WHERE id = ?', args: [id] });
    if (result.rows.length === 0) return res.redirect(frontendUrl || '/');

    const ep = result.rows[0];
    const settingsResult = await db.execute(
      "SELECT value FROM settings WHERE key = 'website_title'"
    );
    const siteTitle = settingsResult.rows[0]?.value || 'TVR Dubbers';
    const pageTitle = `${ep.title} — ${siteTitle}`;
    const description = `Watch Episode ${ep.episode_number} (Season ${ep.season}) — Bangla dub by ${siteTitle}.`;
    const targetUrl = `${frontendUrl}/?episode=${id}`;
    const shareUrl = `${(process.env.PUBLIC_BACKEND_URL || '').replace(/\/$/, '')}/share/episode/${id}`;

    res.set('Content-Type', 'text/html');
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(pageTitle)}</title>
<meta name="description" content="${escapeHtml(description)}">
<meta property="og:title" content="${escapeHtml(pageTitle)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:image" content="${escapeHtml(ep.thumbnail_url || '')}">
<meta property="og:url" content="${escapeHtml(shareUrl)}">
<meta property="og:type" content="video.episode">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(pageTitle)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
<meta name="twitter:image" content="${escapeHtml(ep.thumbnail_url || '')}">
<meta http-equiv="refresh" content="0;url=${escapeHtml(targetUrl)}">
<script>window.location.replace(${JSON.stringify(targetUrl)});</script>
</head>
<body>
<p>Redirecting to <a href="${escapeHtml(targetUrl)}">${escapeHtml(pageTitle)}</a>…</p>
</body>
</html>`);
  } catch (err) {
    console.error('GET /share/episode/:id error:', err);
    res.redirect(frontendUrl || '/');
  }
});

module.exports = router;
