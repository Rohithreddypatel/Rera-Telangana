const puppeteer = require("puppeteer");

/**
 * Shared Browser Manager
 * ──────────────────────
 * Instead of launching one Chromium process per user session (old model,
 * ~300 MB × N users), we keep ONE browser alive for the lifetime of the
 * server process and open a new PAGE (tab) per session.
 *
 * RAM profile on Render free tier:
 *   Old model  — 2 users = 2 × 300 MB = 600 MB → OOM crash
 *   New model  — N users = 1 × 300 MB + N × ~5 MB tabs = ~350 MB flat
 *
 * The browser restarts automatically if it crashes (self-healing).
 */

let _browser = null;
let _launching = false;
let _launchQueue = [];

const BROWSER_ARGS = [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-dev-shm-usage",
  "--disable-gpu",
  "--single-process",   // required on Render free (no zygote process available)
  "--no-zygote",
];

async function _launch() {
  _browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: BROWSER_ARGS,
  });

  // If the browser crashes unexpectedly, clear the reference so the next
  // call to getSharedBrowser() will relaunch it automatically.
  _browser.on("disconnected", () => {
    console.warn("[BrowserService] Browser disconnected — will relaunch on next request.");
    _browser = null;
  });

  console.log("[BrowserService] Shared browser launched.");
  return _browser;
}

/**
 * Returns the shared browser, launching it if it isn't running yet.
 * Concurrent callers during the initial launch are queued so only one
 * puppeteer.launch() call happens at a time.
 */
async function getSharedBrowser() {
  if (_browser) return _browser;

  if (_launching) {
    // Wait until the in-progress launch finishes
    return new Promise((resolve, reject) => {
      _launchQueue.push({ resolve, reject });
    });
  }

  _launching = true;
  try {
    const browser = await _launch();
    _launchQueue.forEach(({ resolve }) => resolve(browser));
    return browser;
  } catch (err) {
    _launchQueue.forEach(({ reject }) => reject(err));
    throw err;
  } finally {
    _launchQueue = [];
    _launching   = false;
  }
}

/**
 * Opens a fresh RERA search page (tab) on the shared browser.
 * Each user session gets its own tab — completely isolated state.
 */
async function openReraPage() {
  const browser = await getSharedBrowser();
  const page    = await browser.newPage();

  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
  );
  await page.setDefaultNavigationTimeout(120000);
  await page.goto("https://rerait.telangana.gov.in/SearchList/Search", {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  return page;
}

/**
 * Close a single page (tab) when a session is done.
 * The shared browser itself stays alive.
 */
async function closePage(page) {
  if (page && !page.isClosed()) {
    try { await page.close(); } catch (_) {}
  }
}

/**
 * Fully shut down the shared browser (called only during server shutdown).
 */
async function closeSharedBrowser() {
  if (_browser) {
    try { await _browser.close(); } catch (_) {}
    _browser = null;
  }
}

// ── Legacy compatibility shims ──────────────────────────────────────────────
// The old API passed `browser` objects around; the new API only uses pages.
// These shims let the rest of the codebase keep compiling without changes.
async function getBrowser()        { return getSharedBrowser(); }
async function closeBrowser(_b)    { /* no-op: shared browser stays alive */ }

module.exports = {
  getSharedBrowser,
  openReraPage,
  closePage,
  closeSharedBrowser,
  // legacy shims
  getBrowser,
  closeBrowser,
};
