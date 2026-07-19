# BESTTHING — Nightlight Game Account Lookup (Web)

A Flask web interface wrapping the Nightlight API. It lists games (with Steam
header images) and fetches Steam login credentials per game, using Playwright to
bypass Cloudflare the same way the original CLI script did.

## Features
- Searchable, image-rich game grid
- Click a game to view its Steam login credentials
- "Get Another" button to pull a fresh account for the same game
- Game list cached 5 minutes to reduce API hits

## Run locally
```bash
pip install -r requirements.txt
python -m playwright install chromium
python app.py
```
Open http://localhost:5000

## Deploy (Render — Web Service)
- Build command: `pip install -r requirements.txt && python -m playwright install chromium`
- Start command: `python app.py`
- The app listens on `0.0.0.0:$PORT` (set `PORT` env on Render).

## Notes
- API key and base URL are defined at the top of `app.py`.
- Username returned is the Steam login; no email is returned.
