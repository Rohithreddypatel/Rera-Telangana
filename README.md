# Telangana RERA Projects Dashboard — v2

A full-stack web application to search and manage Telangana RERA registered projects,
using Puppeteer for browser automation and CAPTCHA handling.

---

## Architecture

```
Browser (React + Vite)
       │
       │  X-Api-Key header  ·  sessionStorage session token
       ▼
Express API (port 5000)
  ├── Rate limiter  (express-rate-limit)
  ├── API-key auth  (X-Api-Key header)
  ├── Input validator (express-validator)
  ├── SessionStore  (bounded in-memory Map, 5-min TTL)
  │
  ├── Puppeteer → rerait.telangana.gov.in
  └── Mongoose  → MongoDB Atlas
```

---

## Prerequisites

| Tool    | Version |
|---------|---------|
| Node.js | 18+     |
| MongoDB | 6+ (local or Atlas) |
| npm     | 9+      |

---

## Setup

### 1. Generate an API key

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output — you will need it in both `.env` files below.

### 2. Backend

```bash
cd server
cp .env.example .env
# Edit .env:
#   MONGO_URI  → your real Atlas / local connection string
#   API_KEY    → the hex string from step 1
#   MAX_SESSIONS → max concurrent Puppeteer browsers (default 3)

npm install
npm start          # or: npm run dev
```

Server starts at **http://localhost:5000**

> `npm install` downloads Chromium for Puppeteer (~170 MB). Ensure a stable internet connection.

### 3. Frontend

```bash
cd client
cp .env.example .env
# Edit .env:
#   VITE_API_URL → http://localhost:5000/api  (default, fine for dev)
#   VITE_API_KEY → the same hex string from step 1

npm install
npm run dev
```

Frontend starts at **http://localhost:3000**

---

## Usage

1. Open **http://localhost:3000**
2. Click **"Load CAPTCHA"** — Puppeteer opens the RERA site and returns the CAPTCHA image
3. Type the CAPTCHA characters in the input field
4. Enter a keyword (project name, promoter, RERA number, or district)
5. Click **"Search Projects"** — or **"Cancel"** if you change your mind
6. Results appear and are upserted into MongoDB
7. Click a row for full details; use the bookmark icon to save

---

## Security changes in v2

| # | Fix |
|---|-----|
| 1 | **Credentials removed** — `.env` is in `.gitignore`; `.env.example` has placeholder values only |
| 2 | **API key auth** — all `/api/*` endpoints require `X-Api-Key` header (no-op in dev when key is unset) |
| 3 | **Rate limiting** — captcha: 5/min, search: 10/min, other: 60/min per IP |
| 4 | **Session store** — replaced `global.reraSessions` with a bounded `Map` class (max sessions, TTL eviction, no prototype pollution) |
| 5 | **Crypto session IDs** — `crypto.randomBytes(32).toString('hex')` instead of uuid |
| 6 | **Input validation** — `express-validator` on all routes; sessionId must be a hex string |
| 7 | **ReDoS fix** — free-text search now uses `$text` index; `status`/`district` use literal-escaped `$regex` |
| 8 | **NoSQL injection** — `sanitizeProjectData` allowlists known field names before `$set` |
| 9 | **Circuit breaker** — `/api/captcha` returns 503 when `MAX_SESSIONS` is reached |
| 10 | **Scraper performance** — `waitForSelector` replaces the hard-coded 8-second `delay(8000)` |
| 11 | **Detail parsing in Node.js** — label sets no longer serialised into `page.evaluate()` on every call |
| 12 | **Per-page timeout** — `Promise.race` with 30-second limit per detail page prevents hung allSettled |
| 13 | **Cancel button** — `AbortController` lets the user cancel a long-running search |
| 14 | **Shorter axios timeout** — 60 s instead of 180 s |
| 15 | **Compound index** — `{ projectName, promoterName }` sparse index for reliable fallback lookups |
| 16 | **Health endpoint** — `GET /health` returns DB state and active session count |

---

## API Reference

### `GET /health`
Returns server health. No auth required.

```json
{ "status": "ok", "dbState": "connected", "activeSessions": 1 }
```

### `GET /api/captcha`
Rate-limited to 5/min. Returns base64 CAPTCHA PNG and a session token.

### `POST /api/search`
Rate-limited to 10/min. Submits the RERA form and returns scraped + merged project list.

**Body:** `{ query, captcha, sessionId, promoter?, reraNo?, district? }`

### `GET /api/projects`
Returns stored projects. Supports `q` (full-text), `status`, `district`, `isSaved`, `page`, `limit`.

### `GET /api/projects/stats`
Aggregate counts by status and district.

### `POST /api/project/save` / `POST /api/project/unsave`
Toggle saved state by `reraNumber` (or `projectName + promoterName` fallback).

### `PATCH /api/project/notes`
Update free-text notes for a stored project.

### `POST /api/project/details`
Fetch a stored project by identity (no new Puppeteer scrape).

---

## Environment Variables

### server/.env

| Variable       | Default   | Description |
|----------------|-----------|-------------|
| `PORT`         | `5000`    | Server port |
| `MONGO_URI`    | —         | **Required.** MongoDB connection string |
| `CLIENT_ORIGIN`| `http://localhost:3000` | CORS allowed origin |
| `API_KEY`      | —         | Random hex string for bearer auth |
| `MAX_SESSIONS` | `3`       | Max concurrent Puppeteer browsers |

### client/.env

| Variable        | Default                      | Description |
|-----------------|------------------------------|-------------|
| `VITE_API_URL`  | `http://localhost:5000/api`  | Backend base URL |
| `VITE_API_KEY`  | —                            | Must match server `API_KEY` |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "MONGO_URI is not set" | Copy `.env.example` → `.env` and fill in your connection string |
| "Failed to load CAPTCHA" | Backend is not running, or MAX_SESSIONS is reached |
| "Too many requests" | Rate limit hit — wait 60 s |
| "Invalid CAPTCHA" | CAPTCHA expired — click Refresh |
| 401 Unauthorized | API_KEY in client/.env doesn't match server/.env |
| Puppeteer download slow | `npm install` fetches ~170 MB of Chromium on first run |
