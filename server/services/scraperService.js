const { openReraPage, getBrowser, closeBrowser } = require("./browserService");

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

/* ═══════════════════════════════════════════════════════════════
   KNOWN LABELS — defined once in Node.js, not serialised into
   page.evaluate() on every call (was the original bug).
═══════════════════════════════════════════════════════════════ */

const SECTION_HEADERS = new Set([
  "General Information", "Promoter Information - Organization",
  "Address Details", "Organization Contact Details",
  "Past Experience Details", "Member Information",
  "Project Information", "Bank Details",
  "Collection Account of the Project (100%)",
  "Separate Account of the Project (70%)",
  "Transaction Account of the Project (30%)",
  "Land Details", "Built-Up Area Details",
  "Promoter(Land Owner/ Investor) Details",
  "Project Details", "Development Work",
  "Common areas And Facilities, Amenities   Available       Percent Details",
  "Building Details", "Project Professional Information",
  "Litigations Details", "Uploaded Documents",
  "Documents Uploaded After Shortfall",
]);

const FIELD_LABELS = new Set([
  "Project Name", "Project Status", "Approved Date",
  "Proposed Date of Completion",
  "Project Type", "Authority Name", "Plan Approval Number",
  "Litigations related to the project ?",
  "Are there any Promoter(Land Owner/ Investor) (as defined by Telangana RERA Order) in the project ?",
  "Is the project an MSB or a High-Rise?",
  "Bank Name", "Branch Name", "Bank A/c Number", "IFSC Code",
  "Sy.No/TS No.", "Plot No./House No.",
  "Total Area(In sqmts)",
  "Area affected in Road widening/FTL of Tanks/Nala Widening(In sqmts)",
  "Net Area(In sqmts)",
  "Total Building Units (as per approved plan)",
  "Proposed Building Units(as per agreement)",
  "Boundaries East", "Boundaries West", "Boundaries North", "Boundaries South",
  "Approved Built up Area (In Sqmts)",
  "Mortgage Area (In Sqmts)",
  "State", "District", "Mandal", "Village/City/Town",
  "Street", "Locality", "Pin Code",
  "Name", "Organization Type",
  "House No/Sy. No/Block No/Plot No", "Building Name",
  "Street Name", "Land mark", "Website URL",
]);

/* ═══════════════════════════════════════════════════════════════
   HELPERS (run in Node.js, not in browser context)
═══════════════════════════════════════════════════════════════ */

function extractDate(str) {
  const m = str.match(/\d{2}\/\d{2}\/\d{4}/);
  return m ? m[0] : "";
}

function extractNumber(str) {
  const parts = str.split(/\s+|\t/);
  const num = parts.find((p) => /^\d+(\.\d+)?$/.test(p));
  return num || "";
}

/**
 * From a flat array of trimmed, non-empty lines from innerText,
 * find the value that follows a given exact label.
 * occurrence: which occurrence to use (0 = first, 1 = second, …)
 */
function getAfter(lines, labelExact, occurrence = 0) {
  let found = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] === labelExact) {
      if (found < occurrence) { found++; continue; }
      for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
        const v = lines[j].trim();
        if (!v) continue;
        if (SECTION_HEADERS.has(v) || FIELD_LABELS.has(v)) return "";
        if (v.includes("\t") && v.length > 60) return extractDate(v) || extractNumber(v) || "";
        return v;
      }
      return "";
    }
  }
  return "";
}

function getAfterPrefix(lines, labelPrefix, occurrence = 0) {
  let found = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith(labelPrefix)) {
      if (found < occurrence) { found++; continue; }
      for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
        const v = lines[j].trim();
        if (!v) continue;
        if (SECTION_HEADERS.has(v) || FIELD_LABELS.has(v)) return "";
        if (v.includes("\t") && v.length > 60) return extractDate(v) || extractNumber(v) || "";
        return v;
      }
      return "";
    }
  }
  return "";
}

/* ═══════════════════════════════════════════════════════════════
   CAPTCHA
═══════════════════════════════════════════════════════════════ */

async function fetchCaptcha() {
  const browser = await getBrowser();
  const page    = await openReraPage(browser);
  if (!page) { await closeBrowser(browser); throw new Error("Failed to open RERA page."); }

  await page.waitForSelector("body", { timeout: 20000 });
  await delay(2000);

  const captchaEl = await findCaptchaImage(page);
  if (!captchaEl) { await closeBrowser(browser); throw new Error("CAPTCHA image not found."); }

  const buf = await captchaEl.screenshot({ type: "png" });
  return { browser, page, captchaBase64: buf.toString("base64") };
}

async function findCaptchaImage(page) {
  const selectors = [
    'img[src*="captcha" i]', 'img[src*="Captcha"]', 'img[id*="captcha" i]',
    "img.BotDetectCaptchaImage", 'img[src*="BotDetectCaptcha" i]',
    "#CaptchaImage", "#imgCaptcha", 'img[alt*="captcha" i]',
  ];
  for (const sel of selectors) {
    try { const el = await page.$(sel); if (el) return el; } catch (_) {}
  }
  const imgs = await page.$$("img");
  for (const img of imgs) {
    const box = await img.boundingBox().catch(() => null);
    if (box && box.width > 60 && box.height > 20) return img;
  }
  return null;
}

/* ═══════════════════════════════════════════════════════════════
   CAPTCHA FAILURE DETECTION
═══════════════════════════════════════════════════════════════ */

async function detectCaptchaFailure(page) {
  const body = await page.$eval("body", (el) => el.innerText.toLowerCase()).catch(() => "");
  if (
    body.includes("search result") || body.includes("total records") ||
    body.includes("project found")  || body.includes("projects found")
  ) return false;
  return ["invalid captcha","captcha is incorrect","wrong captcha",
          "enter valid captcha","captcha mismatch","please enter captcha",
          "captcha entered is wrong","please enter correct captcha"]
    .some((k) => body.includes(k));
}

/* ═══════════════════════════════════════════════════════════════
   SEARCH FORM SUBMISSION
   FIX: replaces blind delay(8000) with waitForSelector on the
        results table, with a 30s timeout fallback.
═══════════════════════════════════════════════════════════════ */

async function submitSearch(page, searchParams, captchaText) {
  const { query = "", promoter = "", reraNo = "", district = "" } =
    typeof searchParams === "string" ? { query: searchParams } : searchParams;

  if (!page || page.isClosed()) throw new Error("Session page is invalid.");

  const searchSel = await pickSelector(page, [
    "#Project", 'input[name="Project"]', "#txtProjectName",
    'input[placeholder*="project" i]', 'input[type="text"]',
  ]);
  if (!searchSel) throw new Error("Project search field not found.");
  await clearAndType(page, searchSel, query);

  if (promoter) {
    const s = await pickSelector(page, ["#promoter_name", 'input[name="Promoter"]']);
    if (s) await clearAndType(page, s, promoter);
  }
  if (reraNo) {
    const s = await pickSelector(page, ["#CertiNo", 'input[name="CertiNo"]']);
    if (s) await clearAndType(page, s, reraNo);
  }
  if (district) {
    try { await page.select("#District", district); } catch (_) {}
  }

  const captchaSel = await pickSelector(page, [
    "#Captcha", "#txtCaptcha", 'input[name="Captcha"]',
    'input[name*="captcha" i]', 'input[id*="captcha" i]',
  ]);
  if (!captchaSel) throw new Error("CAPTCHA field not found.");

  const cleanCaptcha = captchaText.trim().replace(/\s/g, "").toUpperCase();
  await page.click(captchaSel);
  await delay(300);
  await page.evaluate((sel) => { document.querySelector(sel).value = ""; }, captchaSel);
  await delay(200);
  for (const ch of cleanCaptcha) {
    await page.type(captchaSel, ch, { delay: 250 });
    await delay(150);
  }
  await delay(500);
  await page.keyboard.press("Tab");
  await delay(500);

  const submitSel = await pickSelector(page, [
    "#btnSearch", 'input[type="submit"]', 'button[type="submit"]', 'input[name="Command"]',
  ]);
  if (!submitSel) throw new Error("Submit button not found.");
  await page.evaluate((sel) => { document.querySelector(sel)?.click(); }, submitSel);

  // FIX: wait for results table to appear instead of a fixed 8-second sleep.
  // Falls back to a 30-second hard timeout so the request doesn't hang forever.
  try {
    await page.waitForSelector("table tr", { timeout: 30000 });
  } catch (_) {
    // Table may not appear on CAPTCHA failure — detectCaptchaFailure handles that below.
  }

  const failed = await detectCaptchaFailure(page);
  if (failed) throw new Error("CAPTCHA_INVALID");

  return await scrapeResultsTable(page);
}

/* ═══════════════════════════════════════════════════════════════
   RESULTS TABLE PARSER
═══════════════════════════════════════════════════════════════ */

async function scrapeResultsTable(page) {
  return await page.evaluate(() => {
    const rows = [...document.querySelectorAll("table tr")];
    return rows.slice(1).map((row) => {
      const cells = [...row.querySelectorAll("td")];
      if (cells.length < 3) return null;
      const getText    = (i) => cells[i]?.innerText?.trim() || "";
      const links      = [...row.querySelectorAll("a")];
      const detailLink = links.find((a) => a.innerText.toLowerCase().includes("view"));
      const col3       = getText(3);
      const looksLikeReraNo = /^[A-Z]{1,3}\/?[0-9]{4,}/i.test(col3) || col3.startsWith("P0");
      return {
        sno: getText(0), projectName: getText(1), promoterName: getText(2),
        reraNumber: looksLikeReraNo ? col3 : `${getText(1)}_${getText(2)}`,
        viewUrl: detailLink?.href || "",
      };
    }).filter(Boolean);
  });
}

/* ═══════════════════════════════════════════════════════════════
   PROJECT DETAIL PAGE SCRAPER
   FIX: label matching now runs in Node.js (not inside page.evaluate)
        — easier to test and no large Set serialisation per call.
   FIX: per-page timeout via Promise.race to prevent one slow
        detail page from blocking the entire allSettled batch.
═══════════════════════════════════════════════════════════════ */

const DETAIL_PAGE_TIMEOUT_MS = 30_000;

async function scrapeProjectDetails(currentPage, viewUrl) {
  const browser = currentPage.browser();
  const page    = await browser.newPage();

  const scrapeWork = async () => {
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    );
    await page.goto(viewUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
    await delay(2000);

    // Extract raw lines from the browser; all parsing happens in Node.js below.
    const rawLines = await page.evaluate(() =>
      document.body.innerText
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
    );

    // ── Parse in Node.js ─────────────────────────────────────────────────
    const ga  = (label, occ = 0)  => getAfter(rawLines, label, occ);
    const gap = (prefix, occ = 0) => getAfterPrefix(rawLines, prefix, occ);

    const projectName  = ga("Project Name", 0);
    const status       = ga("Project Status", 0);
    const projectType  = ga("Project Type", 0);
    const promoterName = ga("Name", 0);

    let approvedDate = ga("Approved Date", 0);
    if (!approvedDate) approvedDate = gap("Complition Date at the time of Registration", 0);
    if (!approvedDate) approvedDate = gap("Revised Proposed Date of Completion", 0);
    if (approvedDate && approvedDate.includes(" ")) approvedDate = approvedDate.split(" ")[0];

    const proposedDateofCompletion = ga("Proposed Date of Completion", 0);
    const surveyNo                 = ga("Sy.No/TS No.", 0);
    const totalArea                = ga("Total Area(In sqmts)", 0);
    const netArea                  = ga("Net Area(In sqmts)", 0);
    const totalUnits               = gap("Total Building Units", 0);
    const approvedBuildUpArea      = ga("Approved Built up Area (In Sqmts)", 0);
    const mortgageArea             = ga("Mortgage Area (In Sqmts)", 0);

    // District / Mandal / Village appear twice; take the second (project location)
    const district = ga("District", 1);
    const mandal   = ga("Mandal", 1);
    const village  = ga("Village/City/Town", 1);

    const houseNo      = gap("House No/Sy. No", 0);
    const buildingName = ga("Building Name", 0);
    const streetName   = ga("Street Name", 0);
    const locality     = ga("Locality", 0);
    const pinCode      = ga("Pin Code", 0);
    const address      = [houseNo, buildingName, streetName, locality, pinCode].filter(Boolean).join(", ");

    return {
      projectName, promoterName, status, projectType,
      approvedDate, proposedDateofCompletion,
      surveyNo, totalArea, netArea, totalUnits,
      approvedBuildUpArea, mortgageArea,
      district, mandal, village, address,
      mobile: "", email: "", reraNumber: "",
    };
  };

  // Race the scrape work against a hard timeout
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Detail page timeout")), DETAIL_PAGE_TIMEOUT_MS)
  );

  try {
    return await Promise.race([scrapeWork(), timeout]);
  } catch (err) {
    console.error("[scrapeProjectDetails] error:", err.message);
    return {};
  } finally {
    await page.close().catch(() => {});
  }
}

/* ═══════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════ */

async function pickSelector(page, selectors) {
  for (const sel of selectors) {
    try { const el = await page.$(sel); if (el) return sel; } catch (_) {}
  }
  return null;
}

async function clearAndType(page, selector, value) {
  await page.click(selector);
  await delay(100);
  await page.click(selector, { clickCount: 3 });
  await delay(80);
  await page.keyboard.press("Backspace");
  await delay(50);
  await page.type(selector, value, { delay: 45 });
}

module.exports = { fetchCaptcha, submitSearch, scrapeProjectDetails };
