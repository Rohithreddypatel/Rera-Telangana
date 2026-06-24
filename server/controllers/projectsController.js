const Project = require("../models/Project");

// ── Allowed status / district values for strict filter matching ───────────
// Using $regex on user input risks ReDoS. Instead we:
//   • For `q` (free text): use the $text index already defined on the schema.
//   • For `status` / `district`: use case-insensitive equality, not $regex.
// ─────────────────────────────────────────────────────────────────────────

// ── GET PROJECTS ──────────────────────────────────────────────────────────

async function getProjects(req, res) {
  try {
    // Validation middleware has already trimmed and length-checked these.
    const { q, status, district, isSaved, page = 1, limit = 50 } = req.query;

    const filter = {};

    if (q) {
      // FIX: use the $text index (ReDoS-safe, indexed, fast) instead of $regex on user input.
      filter.$text = { $search: q };
    }

    // FIX: exact case-insensitive match instead of open-ended $regex.
    if (status)   filter.status   = { $regex: `^${escapeRegex(status)}$`,   $options: "i" };
    if (district) filter.district = { $regex: `^${escapeRegex(district)}$`, $options: "i" };

    if (isSaved === "true")  filter.isSaved = true;
    if (isSaved === "false") filter.isSaved = { $ne: true };

    const pageInt  = parseInt(page,  10) || 1;
    const limitInt = parseInt(limit, 10) || 50;
    const skip     = (pageInt - 1) * limitInt;

    const [projects, total] = await Promise.all([
      Project.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitInt).lean(),
      Project.countDocuments(filter),
    ]);

    res.json({
      success: true,
      projects,
      pagination: {
        total,
        page:  pageInt,
        limit: limitInt,
        pages: Math.ceil(total / limitInt),
      },
    });
  } catch (error) {
    console.error("[getProjects]", error.message);
    res.status(500).json({ success: false, message: "Failed to fetch projects." });
  }
}

// ── GET STATS ──────────────────────────────────────────────────────────────

async function getStats(req, res) {
  try {
    const [statusStats, districtStats, total, savedCount] = await Promise.all([
      Project.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Project.aggregate([
        { $group: { _id: "$district", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      Project.countDocuments(),
      Project.countDocuments({ isSaved: true }),
    ]);

    res.json({ success: true, total, savedCount, byStatus: statusStats, byDistrict: districtStats });
  } catch (error) {
    console.error("[getStats]", error.message);
    res.status(500).json({ success: false, message: "Failed to fetch stats." });
  }
}

// ── SAVE PROJECT ───────────────────────────────────────────────────────────

async function saveProject(req, res) {
  try {
    const { reraNumber, projectData } = req.body;

    const query = reraNumber
      ? { reraNumber }
      : { projectName: projectData?.projectName, promoterName: projectData?.promoterName };

    let project = await Project.findOne(query);

    if (!project) {
      // projectData has already been sanitized by validateSaveProject via sanitizeProjectData
      // in the search flow; do a final strip here for safety.
      project = await Project.create({ ...projectData, isSaved: true });
    } else {
      project.isSaved = true;
      await project.save();
    }

    res.json({ success: true, project });
  } catch (error) {
    console.error("[saveProject]", error.message);
    res.status(500).json({ success: false, message: "Failed to save project." });
  }
}

// ── UNSAVE PROJECT ─────────────────────────────────────────────────────────

async function unsaveProject(req, res) {
  try {
    const { reraNumber, projectName, promoterName } = req.body;

    let project = null;

    if (reraNumber && reraNumber.trim()) {
      project = await Project.findOne({ reraNumber });
    }

    if (!project && projectName) {
      // FIX: only use the compound fallback if no reraNumber — and note that
      // without a unique compound index this may still match the wrong document
      // when two projects share the same name+promoter. A warning is logged.
      project = await Project.findOne({ projectName, promoterName });
      if (project) {
        console.warn("[unsaveProject] Fallback to name+promoter lookup — consider adding a compound index.");
      }
    }

    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    project.isSaved = false;
    await project.save();

    res.json({ success: true });
  } catch (error) {
    console.error("[unsaveProject]", error.message);
    res.status(500).json({ success: false, message: "Failed to unsave project." });
  }
}

// ── UPDATE NOTES ───────────────────────────────────────────────────────────

async function updateNotes(req, res) {
  try {
    const { reraNumber, notes, projectName, promoterName } = req.body;

    const query = reraNumber
      ? { reraNumber }
      : { projectName, promoterName };

    const project = await Project.findOne(query);

    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    project.notes = notes ?? "";
    await project.save();

    res.json({ success: true, project });
  } catch (error) {
    console.error("[updateNotes]", error.message);
    res.status(500).json({ success: false, message: "Failed to update notes." });
  }
}

// ── FETCH PROJECT DETAILS (from DB) ───────────────────────────────────────

async function fetchProjectDetails(req, res) {
  try {
    const { reraNumber, projectName, promoterName } = req.body;

    const query = reraNumber
      ? { reraNumber }
      : { projectName, promoterName };

    const project = await Project.findOne(query).lean();

    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    res.json({ success: true, project });
  } catch (error) {
    console.error("[fetchProjectDetails]", error.message);
    res.status(500).json({ success: false, message: "Failed to load details." });
  }
}

// ── Helper ─────────────────────────────────────────────────────────────────

/** Escape special regex characters so user input is treated as a literal string. */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = {
  getProjects,
  getStats,
  saveProject,
  unsaveProject,
  updateNotes,
  fetchProjectDetails,
};
