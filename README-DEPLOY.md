# Vietnam Airlines PTFS — Deploy Package

A complete static website — no server, no database, no build step. This
folder is the entire site. Publish it as-is to any static host.

## Quick deploy — Netlify (fastest, ~60 seconds)

1. Open <https://app.netlify.com/drop>
2. Sign in (or create a free account) when prompted.
3. Drag this whole folder into the page.
4. Done — Netlify gives you a `https://<random-name>.netlify.app` URL.
5. Optional: add a custom domain under **Site settings → Domain management**,
   and the SPA link (`_redirects` / `netlify.toml`) is already in place for
   clean URLs.

## Deploy — Git-connected (Netlify / GitHub Pages)

- **Netlify:** push this folder's contents to the root of a GitHub/GitLab
  repo and connect it. `netlify.toml` already sets `publish = "."` with no
  build command — no configuration needed.
- **GitHub Pages:** push to a repo, enable Pages on the branch root. The site
  uses hash-based routing (`#/about`), so it works without any redirect rules.

## What's inside

| File            | Purpose                                            |
|-----------------|----------------------------------------------------|
| `index.html`    | Public site shell (SPA)                            |
| `app.js`        | Engine: routing, rendering, admin auth, drafts     |
| `styles.css`    | Full design system (VNA blue / gold, responsive)   |
| `content.json`  | **The site's content — single source of truth**    |
| `admin.html`    | Admin panel (identity, theme, nav, pages, export)  |
| `favicon.svg`   | Site icon                                          |
| `_redirects`    | Netlify SPA fallback (`/* → /index.html`)          |
| `netlify.toml`  | Netlify config (no build, publish root)            |

## Publishing content changes

Content lives in `content.json`. To publish an edit:

1. Open the live site's `/admin` (or the local `admin.html`).
2. **Import / Export → Export config.json**.
3. Replace `content.json` in this folder with the exported file.
4. Redeploy (drag-and-drop again, or commit + push).

## Notes & limitations

- **Admin login is a lightweight gate, not real security.** The password is
  stored as a SHA-256 hash in `content.json`, but it still runs entirely in
  the browser. Use a throwaway password; for real access control put the
  whole site behind Netlify's **Visitor access** password, or move auth to a
  serverless function.
- **Hero/section images** are currently Discord CDN links
  (`cdn.discordapp.com` / `media.discordapp.net`) carried over from the old
  build. Those URLs carry an expiry timestamp and will eventually break. The
  site degrades gracefully (teal fallback), but re-host any image you want to
  keep long-term via **Admin → upload** or permanent hosting.
- **Local drafts:** editing in `/admin` stores edits in the browser's local
  storage as a draft overlay. Only `content.json` published with the deploy
  is visible to everyone.