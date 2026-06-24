const { submitSearch, scrapeProjectDetails } = require("../services/scraperService");
const { closeBrowser }                       = require("../services/browserService");
const { sessionStore }                       = require("../services/sessionStore");
const { sanitizeProjectData }                = require("../middleware/validators");
const Project                                = require("../models/Project");

async function search(req, res) {
  const { query, captcha, promoter, reraNo, district, sessionId } = req.body;

  // Consume the session atomically — it is now deleted from the store
  // regardless of what happens next, so it can never be replayed.
  const session = sessionStore.consume(sessionId);
  if (!session) {
    return res.status(400).json({ success: false, message: "CAPTCHA session expired or not found. Please reload CAPTCHA." });
  }

  try {
    // STEP 1: Submit form, get raw project list
    const rawProjects = await submitSearch(
      session.page,
      { query: query || "", promoter: promoter || "", reraNo: reraNo || "", district: district || "" },
      captcha.trim().toUpperCase()
    );

    // STEP 2: Scrape detail pages in parallel (with per-page timeout inside scrapeProjectDetails)
    const detailResults = await Promise.allSettled(
      rawProjects.map((proj) =>
        proj.viewUrl ? scrapeProjectDetails(session.page, proj.viewUrl) : Promise.resolve({})
      )
    );

    // Merge detail data into each project
    rawProjects.forEach((proj, i) => {
      const result = detailResults[i];
      if (result.status === "fulfilled" && result.value) {
        const d = result.value;
        if (d.reraNumber && d.reraNumber.trim()) proj.reraNumber = d.reraNumber.trim();

        proj.rawDetails               = d;
        proj.projectType              = d.projectType              || proj.projectType  || "";
        proj.status                   = d.status                   || proj.status       || "";
        proj.promoterAddress          = d.address                  || "";
        proj.promoterMobile           = d.mobile                   || "";
        proj.promoterEmail            = d.email                    || "";
        proj.totalArea                = d.totalArea                || "";
        proj.totalUnits               = d.totalUnits               || "";
        proj.approvedDate             = d.approvedDate             || "";
        proj.netArea                  = d.netArea                  || "";
        proj.proposedDateofCompletion = d.proposedDateofCompletion || "";
        proj.approvedBuildUpArea      = d.approvedBuildUpArea      || "";
        proj.mortgageArea             = d.mortgageArea             || "";
        proj.surveyNo                 = d.surveyNo                 || "";
        proj.district                 = d.district                 || proj.district     || "";
        proj.mandal                   = d.mandal                   || "";
        proj.village                  = d.village                  || "";
      }
    });

    // STEP 3: Upsert into MongoDB
    // FIX: sanitizeProjectData strips any $ / . operator keys from scraped
    //      content before it reaches the $set payload, preventing NoSQL injection.
    let savedCount = 0;
    for (const proj of rawProjects) {
      if (!proj.projectName) continue;
      try {
        const safeProj = sanitizeProjectData(proj);
        await Project.findOneAndUpdate(
          { reraNumber: proj.reraNumber },
          { $set: safeProj },
          { upsert: true, new: true }
        );
        savedCount++;
      } catch (err) {
        console.error("[MongoDB upsert error]", err.message);
      }
    }

    await closeBrowser(session.browser).catch(() => {});

    res.json({ success: true, projects: rawProjects, saved: savedCount });
  } catch (error) {
    await closeBrowser(session.browser).catch(() => {});

    if (error.message === "CAPTCHA_INVALID") {
      return res.status(422).json({
        success: false,
        message: "Invalid CAPTCHA. Please reload and try again.",
        captchaInvalid: true,
      });
    }

    console.error("[Search] error:", error.message);
    res.status(500).json({ success: false, message: error.message || "Search failed." });
  }
}

module.exports = { search };
