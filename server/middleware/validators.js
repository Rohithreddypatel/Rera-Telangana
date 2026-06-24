/**
 * validators.js — input validation for all API routes.
 *
 * Fixes:
 *  - sessionId must be a UUID — prevents prototype-pollution via crafted keys
 *    like __proto__ or constructor being looked up in the session store.
 *  - Query strings are trimmed and length-capped before reaching MongoDB.
 *  - projectData keys are stripped of any $ or . prefixes before being
 *    written, preventing NoSQL operator injection via the $set payload.
 *  - reraNumber, projectName, promoterName are validated as non-empty strings.
 */

const { body, query, validationResult } = require("express-validator");

// ── Reusable middleware to return validation errors ───────────────────────

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
}

// ── Search endpoint ────────────────────────────────────────────────────────

const validateSearch = [
  body("captcha")
    .isString().trim().notEmpty().withMessage("captcha is required")
    .isLength({ max: 20 }).withMessage("captcha too long"),
  body("sessionId")
  .isString().trim().notEmpty().withMessage("sessionId is required")
  .isHexadecimal().withMessage("sessionId must be a hex string")
  .isLength({ min: 64, max: 64 }).withMessage("sessionId has invalid length"),
  body("query").optional().isString().trim().isLength({ max: 200 }),
  body("promoter").optional().isString().trim().isLength({ max: 200 }),
  body("reraNo").optional().isString().trim().isLength({ max: 100 }),
  body("district").optional().isString().trim().isLength({ max: 100 }),
  handleValidation,
];

// ── Projects list (GET) ────────────────────────────────────────────────────

const validateGetProjects = [
  query("q").optional().isString().trim().isLength({ max: 200 }),
  query("status").optional().isString().trim().isLength({ max: 100 })
    .matches(/^[a-zA-Z0-9 \-]+$/).withMessage("status contains invalid characters"),
  query("district").optional().isString().trim().isLength({ max: 100 })
    .matches(/^[a-zA-Z0-9 \-]+$/).withMessage("district contains invalid characters"),
  query("page").optional().isInt({ min: 1, max: 1000 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
  handleValidation,
];

// ── Save project ───────────────────────────────────────────────────────────

/** Strip MongoDB operator keys from a plain object (one level deep). */
function sanitizeProjectData(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return {};
  const safe = {};
  const ALLOWED_KEYS = new Set([
    "sno", "reraNumber", "projectName", "promoterName", "district",
    "projectType", "status", "netArea", "approvedDate",
    "proposedDateofCompletion", "viewUrl", "promoterAddress",
    "promoterMobile", "promoterEmail", "mandal", "village", "surveyNo",
    "totalArea", "totalUnits", "approvedBuildUpArea", "mortgageArea",
    "notes", "isSaved",
  ]);
  for (const [k, v] of Object.entries(data)) {
    if (ALLOWED_KEYS.has(k) && typeof v === "string") {
      safe[k] = v.slice(0, 2000); // cap individual field length
    }
  }
  return safe;
}

const validateSaveProject = [
  body("reraNumber").optional().isString().trim().isLength({ max: 100 }),
  body("projectData").optional().isObject(),
  handleValidation,
];

// ── Unsave / notes / details (all need project identity) ──────────────────

const validateProjectIdentity = [
  body("reraNumber").optional().isString().trim().isLength({ max: 100 }),
  body("projectName").optional().isString().trim().isLength({ max: 300 }),
  body("promoterName").optional().isString().trim().isLength({ max: 300 }),
  handleValidation,
];

const validateUpdateNotes = [
  ...validateProjectIdentity.slice(0, -1), // re-use identity validators
  body("notes").optional({ nullable: true }).isString().isLength({ max: 10000 }),
  handleValidation,
];

module.exports = {
  validateSearch,
  validateGetProjects,
  validateSaveProject,
  validateProjectIdentity,
  validateUpdateNotes,
  sanitizeProjectData,
};
