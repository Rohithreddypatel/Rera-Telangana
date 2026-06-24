const puppeteer = require("puppeteer");

async function getBrowser() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--single-process",
      "--no-zygote",
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