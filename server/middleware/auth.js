/**
 * auth.js — simple API-key middleware.
 *
 * Clients must send:  X-Api-Key: <value of API_KEY in server/.env>
 *
 * To generate a strong key:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *
 * The API key travels in a header (not a query param) so it is kept out of
 * server logs. HTTPS is assumed in production to prevent header interception.
 *
 * If API_KEY is not set in the environment the middleware is a no-op and a
 * warning is printed, so local development works without extra setup.
 */

const API_KEY = process.env.API_KEY;

if (!API_KEY || API_KEY === "change_me_to_a_random_hex_string") {
  console.warn(
    "⚠️   API_KEY is not set or is still the example placeholder. " +
    "All API endpoints are publicly accessible. " +
    "Set a strong API_KEY in server/.env for production."
  );
}

function requireApiKey(req, res, next) {
  // Skip auth if no key is configured (dev convenience)
  if (!API_KEY || API_KEY === "change_me_to_a_random_hex_string") return next();

  const provided = req.headers["x-api-key"];
  if (!provided || provided !== API_KEY) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }
  next();
}

module.exports = { requireApiKey };
