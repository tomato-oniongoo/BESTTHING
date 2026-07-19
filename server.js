const express = require('express');
const { chromium } = require('playwright');

const API_KEY = "NL-5bbb5ce2-bf0c";
const BASE = "https://onajlikezz.xyz/api";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const CACHE_TTL = 5 * 60 * 1000;

const app = express();
app.use(express.static('public'));

let gamesCache = { data: null, ts: 0 };

async function apiGetBrowser(path, params) {
  const qs = new URLSearchParams(params).toString();
  const url = `${BASE}/${path}?${qs}`;
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
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
  games = games.filter(g => g.id && g.name);
  games.sort((a, b) => (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase()));
  gamesCache = { data: games, ts: now };
  return games;
}

async function getCredentials(gameId) {
  const raw = await apiGetBrowser('sentgame.php', { gameid: gameId, key: API_KEY });
  return JSON.parse(raw);
}

app.get('/api/games', async (req, res) => {
  try {
    const games = await getGames(req.query.force === '1');
    res.json({ games });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.get('/api/credentials', async (req, res) => {
  const gid = req.query.gameid;
  if (!gid) return res.status(400).json({ error: 'gameid required' });
  try {
    const creds = await getCredentials(gid);
    res.json(creds);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => {
  console.log(`BESTTHING listening on ${port}`);
});
