const { randomBytes } = require("crypto");
const { fetchCaptcha } = require("../services/scraperService");
const { sessionStore } = require("../services/sessionStore");

async function getCaptcha(req, res) {
  // Circuit breaker: refuse to spawn another browser if we're at capacity
  if (!sessionStore.hasCapacity()) {
    return res.status(503).json({
      success: false,
      message: `Server is busy (max ${process.env.MAX_SESSIONS || 3} concurrent sessions). Please try again in a moment.`,
    });
  }

  try {
    const { browser, page, captchaBase64 } = await fetchCaptcha();

    // FIX: use crypto.randomBytes for session ID instead of uuid v4,
    // which gives a cryptographically random 32-byte hex token.
    const sessionId = randomBytes(32).toString("hex");

    sessionStore.set(sessionId, { browser, page });

    res.json({ success: true, captchaImage: captchaBase64, sessionId });
  } catch (error) {
    console.error("[CaptchaController] Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to load CAPTCHA. Please try again.",
      error: error.message,
    });
  }
}

module.exports = { getCaptcha };
