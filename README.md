# BESTTHING — Nightlight Game Account Lookup (Node.js)

A Node.js + Express web app wrapping the Nightlight API. It lists games (with
Steam header images) and fetches Steam login credentials per game, using
Playwright to bypass Cloudflare the same way the original script did.

## Features
- Searchable, image-rich game grid
- Click a game to view its Steam login credentials
- "Get Another" button to pull a fresh account for the same game
- Game list cached 5 minutes to reduce API hits

## Run locally
```bash
npm install
npx playwright install chromium
node server.js
```
Open http://localhost:3000

## Deploy (Render — Web Service / Blueprint)
- Build command: `npm install && npx playwright install chromium`
- Start command: `node server.js`
- Listens on `0.0.0.0:$PORT` (Render sets PORT automatically).

## Notes
- API key and base URL are defined at the top of `server.js`.
- Username returned is the Steam login; no email is returned.
