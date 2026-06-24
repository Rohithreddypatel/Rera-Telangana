const mongoose = require("mongoose");

/**
 * Full Telangana RERA project schema.
 * Covers both search-list fields and detail-page fields.
 */
const ProjectSchema = new mongoose.Schema(
  {
    // ── Search result fields ─────────────────────────────────────────────
    sno:              { type: String, trim: true },
    reraNumber:       { type: String, default: null, trim: true, index: true },
    projectName:      { type: String, trim: true },
    promoterName:     { type: String, trim: true },
    district:         { type: String, trim: true },
    projectType:      { type: String, trim: true },
    status:           { type: String, trim: true },
    netArea:          { type: String, trim: true },
    approvedDate:     { type: String, trim: true },
    proposedDateofCompletion: { type: String, trim: true },
    viewUrl:          { type: String, trim: true },
    viewOnclick:      { type: String, trim: true },

    // ── Detail page fields ───────────────────────────────────────────────
    promoterAddress:  { type: String, trim: true },
    promoterMobile:   { type: String, trim: true },
    promoterEmail:    { type: String, trim: true },
    mandal:           { type: String, trim: true },
    village:          { type: String, trim: true },
    surveyNo:         { type: String, trim: true },
    totalArea:        { type: String, trim: true },
    totalUnits:       { type: String, trim: true },
    approvedBuildUpArea: { type: String, trim: true },
    mortgageArea:     { type: String, trim: true },

    // Raw detail dump — Mixed type is intentional (varies per project)
    rawDetails:       { type: mongoose.Schema.Types.Mixed, default: {} },

    // User notes
    notes:            { type: String, trim: true, default: "" },

    // Whether the user has "saved" this project
    isSaved:          { type: Boolean, default: false },
  },
  { timestamps: true }
);

// ── Indexes ────────────────────────────────────────────────────────────────

// Full-text search index (used by getProjects instead of $regex)
ProjectSchema.index({
  projectName:  "text",
  promoterName: "text",
  reraNumber:   "text",
  district:     "text",
  mandal:       "text",
});

// FIX: compound sparse index for the name+promoter fallback lookup in
// unsaveProject / fetchProjectDetails. sparse: true means documents
// without both fields don't occupy index space.
ProjectSchema.index(
  { projectName: 1, promoterName: 1 },
  { sparse: true }
);

module.exports = mongoose.model("Project", ProjectSchema);
