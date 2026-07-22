require('dotenv').config();
const bcrypt = require('bcryptjs');
const { db, initSchema } = require('../db/client');

// The source spec's PDF lost its digits in a few places (a text-extraction
// quirk), including the default admin password suffix ("rocky@___"). Rather
// than guess at a real credential, this reads the real password from an env
// var so nothing made-up ever becomes your actual login. If you don't set
// one, a placeholder is used and printed loudly below — change it immediately.
const ADMIN_PASSWORD = process.env.ADMIN_INITIAL_PASSWORD || 'rocky@2025-CHANGE-ME';

const DEFAULT_SETTINGS = {
  website_title: 'TVR Dubbers',
  motto: 'We Believe in Quality',
  special_folder_thumbnail: '',
  special_folder_label: 'Season 1 · Special Episodes',
  countdown_target_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  facebook: 'https://facebook.com/dubtvr',
  youtube: 'https://youtube.com/@tvr_dubbers',
  telegram: 'https://t.me/TVR_Dubbers',
  whatsapp: '',
  instagram: '',
  dailymotion: '',
  rumble: '',
};

const VOICE_ARTISTS = [
  'Md Afsin',
  'Argho Shekhar',
  'Yousa Mahin',
  'Redwan Ahmed',
  'Amjad Hussain',
  'Meherima Jahan',
  'Saurav Talukder',
  'Shehzana Rahman',
  'Bushrath Jahan',
  'Kamonika Paul',
  'Sabrina Ahmed',
];

async function seed() {
  console.log('Creating tables (if not already present)...');
  await initSchema();

  console.log('Seeding admin account...');
  const existingAdmin = await db.execute('SELECT id FROM admin WHERE id = 1');
  if (existingAdmin.rows.length === 0) {
    const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    await db.execute({ sql: 'INSERT INTO admin (id, password_hash) VALUES (1, ?)', args: [hash] });
    console.log('  Admin account created.');
  } else {
    console.log('  Admin account already exists — leaving password untouched.');
  }

  console.log('Seeding default settings (only keys that are still empty)...');
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    const existing = await db.execute({ sql: 'SELECT value FROM settings WHERE key = ?', args: [key] });
    if (existing.rows.length === 0) {
      await db.execute({ sql: 'INSERT INTO settings (key, value) VALUES (?, ?)', args: [key, value] });
    }
  }

  console.log('Seeding voice artist roster (only if the table is empty)...');
  const existingArtists = await db.execute('SELECT COUNT(*) as c FROM voice_artists');
  if (Number(existingArtists.rows[0].c) === 0) {
    for (let i = 0; i < VOICE_ARTISTS.length; i++) {
      await db.execute({
        sql: 'INSERT INTO voice_artists (name, display_order) VALUES (?, ?)',
        args: [VOICE_ARTISTS[i], i],
      });
    }
    console.log(`  Added ${VOICE_ARTISTS.length} voice artists.`);
  } else {
    console.log('  Voice artist table already has entries — leaving as-is.');
  }

  console.log('\nDone.');
  if (!process.env.ADMIN_INITIAL_PASSWORD) {
    console.log(
      `\n*** No ADMIN_INITIAL_PASSWORD was set, so the placeholder password "${ADMIN_PASSWORD}" was used. ***\n` +
        '*** Log in once and change it immediately from the admin panel (Change Admin Password). ***'
    );
  }
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
