/**
 * rateLimiter.js
 *
 * Fixes:
 *  - captchaLimiter: max 5 requests/minute per IP — each request spawns a
 *    Chromium browser (~300 MB), so bursting must be stopped at the edge.
 *  - searchLimiter:  max 10 requests/minute per IP — prevents scraper abuse.
 *  - apiLimiter:     general 60 requests/minute per IP for all other routes.
 */

const rateLimit = require("express-rate-limit");

const captchaLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many CAPTCHA requests. Please wait a minute and try again." },
});

const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many search requests. Please wait a minute and try again." },
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests. Please slow down." },
});

module.exports = { captchaLimiter, searchLimiter, apiLimiter };
