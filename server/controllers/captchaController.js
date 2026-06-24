const { randomBytes } = require("crypto");
const { fetchCaptcha } = require("../services/scraperService");
const { sessionStore } = require("../services/sessionStore");

async function getCaptcha(req, res) {
  // Circuit breaker: refuse if we're at the tab limit
  if (!sessionStore.hasCapacity()) {
    return res.status(503).json({
      success: false,
      message: `Server is busy (${sessionStore.size()} active sessions). Please try again in a moment.`,
    });
  }

  try {
    // fetchCaptcha now returns { page, captchaBase64 } — no browser object
    const { page, captchaBase64 } = await fetchCaptcha();

    const sessionId = randomBytes(32).toString("hex");

    // Store only the page (tab), not a whole browser
    sessionStore.set(sessionId, { page });

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
