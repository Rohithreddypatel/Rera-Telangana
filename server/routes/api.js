const express = require("express");
const router  = express.Router();

const { requireApiKey }                             = require("../middleware/auth");
const { captchaLimiter, searchLimiter, apiLimiter } = require("../middleware/rateLimiter");
const {
  validateSearch, validateGetProjects,
  validateSaveProject, validateProjectIdentity, validateUpdateNotes,
} = require("../middleware/validators");

const { getCaptcha }        = require("../controllers/captchaController");
const { search }            = require("../controllers/searchController");
const {
  getProjects, getStats,
  saveProject, unsaveProject,
  updateNotes, fetchProjectDetails,
} = require("../controllers/projectsController");

// All routes require a valid API key (no-op in dev when API_KEY is unset)
router.use(requireApiKey);

// General rate limit on all /api/* routes
router.use(apiLimiter);

// ── CAPTCHA ────────────────────────────────────────────────────────────────
router.get("/captcha", captchaLimiter, getCaptcha);

// ── SEARCH ─────────────────────────────────────────────────────────────────
router.post("/search", searchLimiter, validateSearch, search);

// ── PROJECTS ───────────────────────────────────────────────────────────────
router.get("/projects",       validateGetProjects,    getProjects);
router.get("/projects/stats",                         getStats);

// ── SAVE / UNSAVE ──────────────────────────────────────────────────────────
router.post("/project/save",   validateSaveProject,    saveProject);
router.post("/project/unsave", validateProjectIdentity, unsaveProject);

// ── NOTES ──────────────────────────────────────────────────────────────────
router.patch("/project/notes", validateUpdateNotes,   updateNotes);

// ── DETAILS (from DB) ──────────────────────────────────────────────────────
router.post("/project/details", validateProjectIdentity, fetchProjectDetails);

module.exports = router;
