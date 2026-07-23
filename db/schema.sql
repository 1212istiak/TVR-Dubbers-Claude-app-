-- TVR Dubbers — database schema (Turso / SQLite-compatible)
-- Run once via `npm run seed` (the seed script executes this file, then seeds
-- starter data). Safe to re-run: every statement is IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS episodes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  episode_number INTEGER NOT NULL,
  season INTEGER DEFAULT 1,
  genre TEXT,
  thumbnail_url TEXT,
  primary_server_url TEXT,
  backup_server_url TEXT,
  is_special INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  view_count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  episode_id INTEGER NOT NULL,
  nickname TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  episode_id INTEGER NOT NULL,
  visitor_id TEXT NOT NULL,
  reaction_type TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(episode_id, visitor_id),
  FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
-- Keys in use: website_title, motto, special_folder_thumbnail, special_folder_label,
-- countdown_target_date, facebook, youtube, telegram, whatsapp, instagram,
-- dailymotion, rumble

CREATE TABLE IF NOT EXISTS trailer (
  id INTEGER PRIMARY KEY,
  title TEXT,
  genre TEXT,
  thumbnail_url TEXT,
  primary_server_url TEXT,
  backup_server_url TEXT
);

CREATE TABLE IF NOT EXISTS voice_artists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  display_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS admin (
  id INTEGER PRIMARY KEY,
  password_hash TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_episodes_created_at ON episodes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_episodes_is_special ON episodes(is_special);
CREATE INDEX IF NOT EXISTS idx_episodes_genre ON episodes(genre);
CREATE INDEX IF NOT EXISTS idx_comments_episode_id ON comments(episode_id);
CREATE INDEX IF NOT EXISTS idx_reactions_episode_id ON reactions(episode_id);
