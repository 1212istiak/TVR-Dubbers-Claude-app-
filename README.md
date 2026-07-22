# TVR Dubbers — Streaming Website

Full-stack rebuild of the TVR Dubbers site: Bangla-dubbed *Battle Through the
Heavens*, streamed from a dark-glassmorphism, cinematic front end with a full
admin CMS behind it.

## Stack

- **Frontend** — vanilla HTML/CSS/JS (ES modules, no build step, no framework).
  Deploy target: **Netlify**.
- **Backend** — Node.js + Express REST API. Deploy target: **Render**.
- **Database** — Turso (SQLite-compatible). The same code also runs against a
  local SQLite file with zero config, so you can develop without a Turso
  account and only need one when you deploy.
- **Auth** — JWT admin sessions, bcrypt-hashed password (via `bcryptjs`, a
  pure-JS implementation of the same algorithm — chosen over the native
  `bcrypt` package so `npm install` never needs to compile anything on
  Render's build machine).

## Project structure

```
backend/
  server.js            Express app, CORS, security headers, route mounting
  db/schema.sql         Table definitions (also read by client.js at boot)
  db/client.js           Turso/libSQL client — same code path for local file
                          or real Turso, decided entirely by env vars
  routes/                One file per resource (episodes, trailer, settings,
                          voice-artists, comments, reactions, admin, share)
  middleware/             JWT auth guard + rate limiters
  utils/                  Embed-URL normalizer, input validation helpers
  scripts/seed.js         Creates tables + seeds admin/settings/voice artists
frontend/
  index.html
  css/style.css           Everything, including the color-cycle system
  js/                     ES modules: config, api, utils, particles, cursor,
                          player (video modal), admin (the CMS), main (glue)
```

## Local development

**Backend:**
```
cd backend
cp .env.example .env        # fill in JWT_SECRET at minimum — see comments in the file
npm install
npm run seed                # creates tables + an admin account + starter settings
npm run dev                  # http://localhost:3000
```
With `TURSO_DB_URL` left blank in `.env`, this runs against a local
`local.db` SQLite file automatically — no Turso account needed to develop.

**Frontend:**
Serve the `frontend/` folder with any static server, e.g.
`npx serve frontend` or `python3 -m http.server 5500` from inside it. Then
open `index.html` in a browser. It talks to whatever `API_BASE` is set to
in the `<script>` block at the top of `index.html` — point that at
`http://localhost:3000` for local dev.

## Design notes

- **Color-cycle system.** The spec's 9-color glow sequence (cyan → white/red
  glow → green → indigo → deep pink → off-white → light pink/white glow →
  sea blue/sky glow → white/pink glow) is one shared CSS `@keyframes`
  animation (`--qc-duration`, 26s) applied to headings, tile borders, and the
  cursor ring together, so the whole page pulses as a single system rather
  than several unrelated effects. Tiles get a phase offset
  (`animation-delay`) so a grid doesn't flash in unison.
- **Fonts.** Anton (hero only) + Rajdhani for bold display/UI text, paired
  with Hind Siliguri for body copy and anything that might be Bangla —
  Rajdhani and Hind are companion families from the same foundry, designed
  to sit together, which is why they're paired here rather than picked at
  random.
- **Genre list** is admin-dropdown only (`GENRES` array in `js/admin.js`) —
  the database column itself is free text, so editing that array is enough
  to change the options.

## Assumptions & defaults (read this)

Your source PDF lost its digits in several places — almost certainly a font
issue in whatever generated it (letters and punctuation came through fine;
numerals didn't). Rather than guess and silently ship a wrong number, here
is the full list of places I picked a default. All are one-line changes:

| Spec item | What was missing | Default used | Where to change it |
|---|---|---|---|
| Base theme color | hex code was blank | `#0a0a12` (near-black, cool undertone) | `--bg-base` in `style.css` |
| Admin reveal clicks | click count blank | 5 (matches your existing site) | `ADMIN_REVEAL_CLICKS` in `js/config.js` |
| Admin session length | hours blank | 24h | `SESSION_LENGTH` in `routes/admin.js` |
| Special-folder collapsed count | "first N episodes" blank | 6 | `SPECIAL_COLLAPSED_COUNT` in `js/config.js` |
| Comment polling interval | "every N-N seconds" blank | 8s | `COMMENT_POLL_MS` in `js/config.js` |
| "New" badge window | not specified | 24h | `NEW_BADGE_HOURS` in `js/config.js` |
| Grid columns | count blank | 4 desktop / 3 tablet / 2 mobile | `.episodes-grid` in `style.css` |
| Admin default password | `rocky@___` — suffix blank | **not guessed** — see below | — |
| Genre dropdown options | not specified | Action, Adventure, Fantasy, Martial Arts, Drama, Comedy, Romance, Supernatural | `GENRES` in `js/admin.js` |

**On the admin password specifically:** rather than invent a real credential
and hand it to you as if it were the "real" one, the seed script reads it
from an environment variable (`ADMIN_INITIAL_PASSWORD`) — set that once
before running `npm run seed` the first time and that's your actual
password from day one. If you skip it, a clearly-labeled placeholder is
used and printed to the console as a loud warning; see `DEPLOYMENT.md`.

## What's implemented

Everything in the prompt: sticky header with live search, hero with
Watch Now / Upcoming Episode, admin-editable countdown, Special Episode
folder (collapsed scroll row + fullscreen expand), All Episodes grid with
genre filters and skeleton loading, dark/light mode with system detection,
the full color-cycle + custom cursor + particle system, modal player with
dual-server switching (accepts raw URLs, watch-page URLs, or pasted
`<iframe>` embed codes for both Dailymotion and Rumble), comments +
reactions (one reaction per visitor, floating-emoji animation), the
complete 8-section admin panel, JWT + bcrypt auth with rate limiting,
per-episode OG/Twitter share previews served from the backend, resume-
watching, "New" badges, and view-count analytics.

One deliberate scope note: the spec's `admin` table stores a single
bcrypt hash (one shared admin login), matching the schema you provided —
there's no per-user admin accounts system, since none was in the schema.
