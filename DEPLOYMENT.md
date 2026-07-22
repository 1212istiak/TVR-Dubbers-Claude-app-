# Deployment Guide

You already have a Netlify site (`btth-bangla-dub.netlify.app`) and a
backend repo (`github.com/1212istiak/Redeploy`) on Render from earlier
work. You don't need brand-new accounts — you can push this code over
the same GitHub repo and redeploy on the same Netlify site + Render
service. Steps below work either way (fresh accounts or reusing yours).

## 1. Database — Turso

1. Install the CLI and sign in: `curl -sSfL https://get.tur.so/install.sh | bash`, then `turso auth login`.
2. Create a database: `turso db create tvr-dubbers`.
3. Get the URL: `turso db show tvr-dubbers --url`.
4. Get a token: `turso db tokens create tvr-dubbers`.
   Keep both — you'll paste them into Render in step 3.

(No Turso account yet? You can also create one at turso.tech and do the
same three things from their dashboard instead of the CLI.)

## 2. Push the code to GitHub

```
cd tvr-dubbers
git init
git add .
git commit -m "TVR Dubbers rebuild"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```
This repo has both `backend/` and `frontend/` in it — Render and Netlify
each get pointed at their own subfolder in the next steps, so one repo is
enough.

## 3. Backend — Render

1. [dashboard.render.com](https://dashboard.render.com) → **New +** → **Web Service** → connect the repo.
2. **Root Directory:** `backend`
3. **Build Command:** `npm install`
4. **Start Command:** `npm start`
5. **Environment** tab — add these (values from step 1 + your own):
   - `TURSO_DB_URL` — from `turso db show ... --url`
   - `TURSO_AUTH_TOKEN` — from `turso db tokens create ...`
   - `JWT_SECRET` — any long random string (generate one: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`)
   - `FRONTEND_URL` — your Netlify URL, e.g. `https://btth-bangla-dub.netlify.app` (you can update this after step 4 if you're not sure yet)
   - `PUBLIC_BACKEND_URL` — this same Render service's URL, e.g. `https://tvr-dubbers-api.onrender.com`
   - `ADMIN_INITIAL_PASSWORD` — **set this to your real admin password.** It's only read once, by the seed step next.
6. Deploy. Once it's live, open the **Shell** tab (or run it from your own machine with the same env vars set) and run:
   ```
   npm run seed
   ```
   This creates the tables and seeds your admin account, default settings,
   and the 11-person voice artist list from your PDF. It's safe to re-run —
   it only fills in rows that don't already exist, so it won't overwrite a
   password you've since changed from the admin panel.
7. Confirm it's up: visit `https://<your-render-url>/api/health` — should return `{"ok":true}`.

## 4. Frontend — Netlify

1. [app.netlify.com](https://app.netlify.com) → **Add new site** → **Import an existing project** → same repo.
2. **Base directory:** `frontend`
3. **Publish directory:** `frontend` (there's no build step — it's static files as-is)
4. **Build command:** leave blank
5. Deploy.
6. Open `frontend/index.html` in the repo (or right in Netlify if you use their file editor) and set the one config line near the top:
   ```html
   <script>
     window.TVR_CONFIG = { API_BASE: "https://<your-render-url>" };
   </script>
   ```
   Commit + push (or re-deploy) after changing it.

## 5. Connect them

Double check both directions:
- Render's `FRONTEND_URL` env var matches your real Netlify URL (this is what CORS checks against).
- `index.html`'s `API_BASE` matches your real Render URL.

If you add a custom domain later, update both of these to match.

## 6. First login

1. On your live site, tap/click the site title **5 times** quickly — the login modal appears.
2. Log in with the password you set as `ADMIN_INITIAL_PASSWORD`.
3. Go to the **Password** tab and change it to something you haven't typed into a Render dashboard, just as good practice since it briefly lived in an env var.
4. Go to **Site Settings** / **Links** and fill in anything still blank (special folder thumbnail, countdown date, social links) — these were left empty by the seed script since they're yours to set.
5. Upload your first episode from the **Upload Episode** tab to confirm the Dailymotion/Rumble URL parsing works with your real links.

## Troubleshooting

- **CORS error in the browser console** — `FRONTEND_URL` on Render doesn't match the origin you're loading the site from (check for a trailing slash mismatch, or `www.` vs no `www.`).
- **Admin login says "Admin account is not set up"** — the seed script hasn't been run against this database yet (step 3.6).
- **Episodes save but thumbnails/video don't show** — double-check the URL is actually reachable and, for Rumble specifically, prefer pasting the real `<iframe>` embed code from Rumble's own "Embed" share option rather than a plain watch-page link (Rumble's embed id isn't always derivable from the vanity URL).
- **Render free-tier note**: the service spins down after inactivity and takes a few seconds to wake on the next request — the first load after idle time will feel slow. This is a Render platform behavior, not specific to this code.
