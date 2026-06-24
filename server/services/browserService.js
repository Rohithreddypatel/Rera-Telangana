const puppeteer = require("puppeteer");

/**
 * Launch a new headless Chromium instance.
 *
 * NOTE on --no-sandbox:
 *   This flag is required when running inside Docker/containers (no user namespaces).
 *   If you are running on bare metal with a normal OS user, remove --no-sandbox and
 *   --disable-setuid-sandbox to keep the Chromium renderer sandbox active, which
 *   protects the host if the scraped page serves malicious JavaScript.
 */
async function getBrowser() {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",            // Required in Docker; remove on bare-metal for security
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage", // Prevents OOM in low-memory containers
      "--disable-gpu",
    ],
  });
  return browser;
}

async function openReraPage(browser) {
  const page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
  );
  await page.setDefaultNavigationTimeout(120000);
  await page.goto("https://rerait.telangana.gov.in/SearchList/Search", {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  return page;
}

async function closeBrowser(browser) {
  if (browser) {
    try { await browser.close(); } catch (_) {}
  }
}

module.exports = { getBrowser, openReraPage, closeBrowser };
