/**
 * sessionStore — tracks active CAPTCHA sessions.
 *
 * In the shared-browser model a "session" is just a PAGE (tab), not a whole
 * browser. So the capacity limit is now about tab count, not process count.
 * Each tab uses ~5 MB, so 50 tabs = ~250 MB — perfectly fine on the free tier.
 *
 * MAX_SESSIONS now defaults to 20 (was 3).
 * SESSION_TTL_MS is 90 seconds — short enough to reclaim tabs from users who
 * loaded a CAPTCHA but never submitted.
 */

const { closePage } = require("./browserService");

const MAX_SESSIONS   = parseInt(process.env.MAX_SESSIONS || "20", 10);
const SESSION_TTL_MS = 90 * 1000; // 90 seconds

class SessionStore {
  constructor() {
    this._map = new Map();

    // Evict expired sessions every 30 s (was 60 s)
    this._timer = setInterval(() => this._evictExpired(), 30_000);
    this._timer.unref();
  }

  hasCapacity() {
    return this._map.size < MAX_SESSIONS;
  }

  set(key, session) {
    this._map.set(key, { ...session, createdAt: Date.now() });
  }

  consume(key) {
    const session = this._map.get(key);
    if (!session) return null;
    this._map.delete(key);
    return session;
  }

  size() { return this._map.size; }

  all() { return [...this._map.values()]; }

  clear() { this._map.clear(); }

  async _evictExpired() {
    const now = Date.now();
    for (const [key, session] of this._map) {
      if (now - session.createdAt > SESSION_TTL_MS) {
        // Close the tab, not the whole browser
        await closePage(session.page).catch(() => {});
        this._map.delete(key);
        console.log(`[SessionStore] Evicted expired session ${key.slice(0, 8)}…`);
      }
    }
  }
}

const sessionStore = new SessionStore();

module.exports = { sessionStore };
