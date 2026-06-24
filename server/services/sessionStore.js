/**
 * sessionStore — replaces the raw global.reraSessions object.
 *
 * Fixes:
 *  - Bounded: rejects new sessions when MAX_SESSIONS limit is reached (circuit breaker)
 *  - TTL cleanup: auto-evicts sessions older than SESSION_TTL_MS
 *  - Prototype-safe: only accepts validated UUID keys, so __proto__ / constructor attacks are impossible
 *  - Observable: exposes size() and all() for the health endpoint
 */

const { closeBrowser } = require("./browserService");

const MAX_SESSIONS   = parseInt(process.env.MAX_SESSIONS || "3", 10);
const SESSION_TTL_MS = 5 * 60 * 1000; // 5 minutes

class SessionStore {
  constructor() {
    this._map = new Map();

    // Auto-cleanup expired sessions every 60 s
    this._timer = setInterval(() => this._evictExpired(), 60_000);
    this._timer.unref(); // don't keep the process alive just for cleanup
  }

  /** Returns true if a new session can be created. */
  hasCapacity() {
    return this._map.size < MAX_SESSIONS;
  }

  /** Store a session. key must be a validated UUID string. */
  set(key, session) {
    this._map.set(key, { ...session, createdAt: Date.now() });
  }

  /** Retrieve and remove a session atomically (one-time use). */
  consume(key) {
    const session = this._map.get(key);
    if (!session) return null;
    this._map.delete(key);
    return session;
  }

  /** Number of active sessions. */
  size() {
    return this._map.size;
  }

  /** All session objects (for health check / shutdown). */
  all() {
    return [...this._map.values()];
  }

  /** Remove all sessions (used during shutdown). */
  clear() {
    this._map.clear();
  }

  async _evictExpired() {
    const now = Date.now();
    for (const [key, session] of this._map) {
      if (now - session.createdAt > SESSION_TTL_MS) {
        await closeBrowser(session.browser).catch(() => {});
        this._map.delete(key);
      }
    }
  }
}

const sessionStore = new SessionStore();

module.exports = { sessionStore };
