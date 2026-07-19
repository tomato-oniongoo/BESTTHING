const express = require('express');
const { chromium } = require('playwright');

const API_KEY = process.env.API_KEY || "NL-5bbb5ce2-bf0c";
const BASE = "https://onajlikezz.xyz/api";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const CACHE_TTL = 5 * 60 * 1000;

const app = express();

// --- Security headers: stop injection / clickjacking / MIME sniffing ---
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; img-src 'self' https: data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'none'"
  );
  next();
});

app.use(express.static('public'));

// --- Minimal in-memory rate limiter (per IP) ---
const hits = new Map();
const RATE_LIMIT = 30;          // requests
const RATE_WINDOW = 60 * 1000;  // per minute
app.use((req, res, next) => {
  const ip = req.ip || req.socket.remoteAddress;
  const now = Date.now();
  const rec = hits.get(ip) || { count: 0, ts: now };
  if (now - rec.ts > RATE_WINDOW) { rec.count = 0; rec.ts = now; }
  rec.count++;
  hits.set(ip, rec);
  if (rec.count > RATE_LIMIT) {
    return res.status(429).json({ error: 'Too many requests.' });
  }
  next();
});

let gamesCache = { data: null, ts: 0 };

// Fetch upstream through a headless browser (server-side only).
// The upstream host, path and key NEVER reach the client.
async function apiGetBrowser(path, params) {
  const qs = new URLSearchParams(params).toString();
  const url = `${BASE}/${path}?${qs}`;
  const browser = await chromium.launch({
    headless: true,
    channel: 'chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  try {
    const ctx = await browser.newContext({ userAgent: USER_AGENT });
    const page = await ctx.newPage();
    await page.goto(url, { timeout: 60000, waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(8000);
    return await page.innerText('body');
  } finally {
    await browser.close();
  }
}

async function getGames(force) {
  const now = Date.now();
  if (!force && gamesCache.data && (now - gamesCache.ts) < CACHE_TTL) {
    return gamesCache.data;
  }
  const raw = await apiGetBrowser('gamelist.php', { key: API_KEY });
  let games = JSON.parse(raw);
  // Only expose the fields the UI needs — strip everything else.
  games = games
    .filter(g => g.id && g.name)
    .map(g => ({ id: String(g.id), name: String(g.name), image: g.image ? String(g.image) : '' }))
    .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
  gamesCache = { data: games, ts: now };
  return games;
}

async function getCredentials(gameId) {
  const raw = await apiGetBrowser('sentgame.php', { gameid: gameId, key: API_KEY });
  const data = JSON.parse(raw);
  // Normalize: expose ONLY username/password, never raw upstream payload.
  return {
    username: data.Username || data.username || '',
    password: data.Password || data.password || ''
  };
}

app.get('/api/games', async (req, res) => {
  try {
    const games = await getGames(req.query.force === '1');
    res.json({ games });
  } catch (e) {
    console.error('[games] error:', e);
    res.status(500).json({ error: 'Service unavailable.' });
  }
});

app.get('/api/credentials', async (req, res) => {
  const gid = req.query.gameid;
  if (!gid || !/^[A-Za-z0-9_-]{1,32}$/.test(gid)) {
    return res.status(400).json({ error: 'Invalid request.' });
  }
  try {
    const creds = await getCredentials(gid);
    res.json(creds);
  } catch (e) {
    console.error('[credentials] error:', e);
    res.status(500).json({ error: 'Service unavailable.' });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => {
  console.log(`BESTTHING listening on ${port}`);
});
