require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const episodesRoutes = require('./routes/episodes');
const trailerRoutes = require('./routes/trailer');
const settingsRoutes = require('./routes/settings');
const voiceArtistsRoutes = require('./routes/voiceArtists');
const commentsRoutes = require('./routes/comments');
const reactionsRoutes = require('./routes/reactions');
const adminRoutes = require('./routes/admin');
const shareRoutes = require('./routes/share');

const app = express();

if (!process.env.JWT_SECRET) {
  console.warn(
    'WARNING: JWT_SECRET is not set. Admin login will not work correctly until it is. ' +
      'Set it in your .env file (local) or Render environment variables (production).'
  );
}

app.set('trust proxy', 1); // Render sits behind a proxy — needed for express-rate-limit to see real IPs

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin: process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : '*',
  })
);
app.use(express.json({ limit: '200kb' }));

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/episodes', episodesRoutes);
app.use('/api/trailer', trailerRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/voice-artists', voiceArtistsRoutes);
app.use('/api/comments', commentsRoutes);
app.use('/api/reactions', reactionsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/share', shareRoutes);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Something went wrong' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`TVR Dubbers API listening on port ${PORT}`));
