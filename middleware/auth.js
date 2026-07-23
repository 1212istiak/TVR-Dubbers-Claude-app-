const bcrypt = require('bcryptjs');
const { db } = require('../db/client');

// Simple password-per-request auth.
// Every admin request must include { password: "..." } in the JSON body.
// No tokens, no sessions, no expiry.
async function requireAdmin(req, res, next) {
  const password = req.body && req.body.password;
  if (!password) {
    return res.status(401).json({ error: 'Password is required' });
  }
  try {
    const result = await db.execute('SELECT password_hash FROM admin WHERE id = 1');
    if (result.rows.length === 0) {
      return res.status(500).json({ error: 'Admin account not set up — run the seed script' });
    }
    const match = await bcrypt.compare(password, result.rows[0].password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Wrong password' });
    }
    next();
  } catch (err) {
    console.error('Auth error:', err);
    return res.status(500).json({ error: 'Auth check failed' });
  }
}

module.exports = { requireAdmin };
