const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');

// TURSO_DB_URL / TURSO_AUTH_TOKEN come from Render env vars in production.
// Locally (no env vars set) this falls back to a plain SQLite file on disk,
// so the exact same code path can be developed/tested without a Turso
// account, then pointed at real Turso just by setting the two env vars.
const url = process.env.TURSO_DB_URL || 'file:local.db';
const authToken = process.env.TURSO_AUTH_TOKEN; // undefined is fine for file: mode

const db = createClient(authToken ? { url, authToken } : { url });

async function initSchema() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  // Split on ";" so multiple CREATE TABLE/INDEX statements can run in order —
  // libsql's execute() takes one statement at a time.
  const statements = schema
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
  for (const statement of statements) {
    await db.execute(statement);
  }
}

module.exports = { db, initSchema };
