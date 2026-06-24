import { useState, useEffect } from "react";
import {
  X, Loader2, ExternalLink, Building2, User, MapPin,
  Calendar, Hash, Home, AlertCircle,
  BookmarkPlus, BookmarkCheck, FileText, Save, Layers,
} from "lucide-react";
import { saveProject, unsaveProject, updateNotes } from "../services/api";
import StatusBadge from "./StatusBadge";

const DETAIL_SECTIONS = [
  {
    title: "Project Info",
    icon: Building2,
    fields: [
      { key: "projectName",             label: "Project Name"    },
      { key: "projectType",             label: "Project Type"    },
      { key: "status",                  label: "Status", badge: true },
      { key: "approvedDate",            label: "Approved Date"   },
      { key: "proposedDateofCompletion",label: "Completion Date" },
    ],
  },
  {
    title: "Promoter Details",
    icon: User,
    fields: [
      { key: "promoterName",    label: "Promoter Name" },
      { key: "promoterAddress", label: "Address"       },
      { key: "promoterMobile",  label: "Mobile"        },
      { key: "promoterEmail",   label: "Email"         },
    ],
  },
  {
    title: "Location",
    icon: MapPin,
    fields: [
      { key: "district", label: "District"  },
      { key: "mandal",   label: "Mandal"    },
      { key: "village",  label: "Village"   },
      { key: "surveyNo", label: "Survey No", mono: true },
    ],
  },
  {
    title: "Area & Units",
    icon: Home,
    fields: [
      { key: "totalArea",           label: "Total Area (Sq Yds)"       },
      { key: "netArea",             label: "Net Area (Sq Mts)"         },
      { key: "totalUnits",          label: "Total Units"               },
      { key: "approvedBuildUpArea", label: "Approved Build Up Area"    },
      { key: "mortgageArea",        label: "Mortgage Area"             },
    ],
  },
];

// FIX: accepts savedSet + getProjectKey so modal reads actual saved state
export default function ProjectDetailModal({ project, savedSet, getProjectKey, onClose, onSaved }) {
  // FIX: initialize isSaved from the savedSet prop, not hardcoded false
  const [isSaved,     setIsSaved]     = useState(() => savedSet ? savedSet.has(getProjectKey(project)) : false);
  const [notes,       setNotes]       = useState(project?.notes || "");
  const [noteSaved,   setNoteSaved]   = useState(false);
  const [activeTab,   setActiveTab]   = useState("details");
  const [rawExpanded, setRawExpanded] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  // Sync isSaved if savedSet changes externally (e.g. user bookmarks from table while modal open)
  useEffect(() => {
    if (savedSet && getProjectKey) {
      setIsSaved(savedSet.has(getProjectKey(project)));
    }
  }, [savedSet, project, getProjectKey]);

  // The modal shows data already on the project object (merged during search).
  // No extra Puppeteer scrape needed — all detail data is already in the project.
  const merged = { ...project };

  async function handleSaveToggle() {
    setSaveLoading(true);
    try {
      if (isSaved) {
        await unsaveProject({
          reraNumber:   merged.reraNumber,
          projectName:  merged.projectName,
          promoterName: merged.promoterName,
        });
        setIsSaved(false);
      } else {
        await saveProject(merged.reraNumber, merged);
        setIsSaved(true);
      }
      if (onSaved) onSaved();
    } catch (err) {
      console.error("Save toggle failed:", err);
    } finally {
      setSaveLoading(false);
    }
  }

  async function handleSaveNotes() {
    try {
      await updateNotes(merged.reraNumber, notes, merged.projectName, merged.promoterName);
      setNoteSaved(true);
      setTimeout(() => setNoteSaved(false), 2000);
    } catch (err) {
      console.error("Notes save failed:", err);
    }
  }

  // Raw extras from rawDetails not covered by section fields
  const knownKeys = new Set(DETAIL_SECTIONS.flatMap((s) => s.fields.map((f) => f.key)));
  const rawEntries = merged.rawDetails
    ? Object.entries(merged.rawDetails).filter(
        ([k, v]) => !k.startsWith("_") && !knownKeys.has(k) && k.length < 60 && v
      )
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-3xl max-h-[92vh] flex flex-col card overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ───────────────────────────────────────────── */}
        <div className="flex items-start justify-between p-5 border-b border-gov-700/40 shrink-0">
          <div className="flex-1 min-w-0 pr-4">
            <h2 className="font-display font-bold text-lg text-white truncate">
              {merged.projectName || "Project Details"}
            </h2>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="font-mono text-xs text-amber-400">{merged.reraNumber}</span>
              {merged.status && <StatusBadge status={merged.status} />}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleSaveToggle}
              disabled={saveLoading}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all
                ${isSaved
                  ? "bg-amber-500/20 text-amber-400 border-amber-500/40 hover:bg-amber-500/30"
                  : "bg-gov-800/60 text-gov-300 border-gov-600/40 hover:bg-gov-700/60"}`}
              title={isSaved ? "Remove from saved" : "Save this project"}>
              {saveLoading
                ? <Loader2 size={13} className="animate-spin" />
                : isSaved
                  ? <><BookmarkCheck size={13} />Saved</>
                  : <><BookmarkPlus size={13} />Save</>}
            </button>
            {merged.viewUrl && !merged.viewUrl.startsWith("POSTBACK") && (
              <a href={merged.viewUrl} target="_blank" rel="noopener noreferrer"
                className="btn-secondary flex items-center gap-1.5 text-xs py-1.5">
                <ExternalLink size={13} /> RERA Site
              </a>
            )}
            <button onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gov-700/40 text-gov-400 hover:text-white transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Tabs ─────────────────────────────────────────────── */}
        <div className="flex border-b border-gov-700/40 shrink-0 bg-gov-900/40">
          {["details", "notes"].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 -mb-px
                ${activeTab === tab ? "text-gov-200 border-gov-400" : "text-gov-500 border-transparent hover:text-gov-300"}`}>
              {tab === "details" ? "Full Details" : "Notes"}
            </button>
          ))}
        </div>

        {/* ── Body ─────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {activeTab === "details" && (
            <>
              {DETAIL_SECTIONS.map((section) => {
                const hasData = section.fields.some((f) => merged[f.key]);
                if (!hasData) return null;
                return (
                  <div key={section.title}>
                    <div className="flex items-center gap-2 mb-3">
                      <section.icon size={14} className="text-gov-400" />
                      <h3 className="text-xs font-semibold text-gov-400 uppercase tracking-wider">{section.title}</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {section.fields.map((field) => {
                        const val = merged[field.key];
                        return (
                          <div key={field.key} className="bg-gov-900/50 border border-gov-700/30 rounded-xl p-3">
                            <div className="text-gov-500 text-[10px] uppercase tracking-wider mb-1">{field.label}</div>
                            {field.badge ? (
                              <StatusBadge status={val} />
                            ) : (
                              <div className={`text-sm font-medium ${val ? "text-gray-100" : "text-gov-700"} ${field.mono ? "font-mono text-amber-400" : ""}`}>
                                {val || "—"}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Raw extras */}
              {rawEntries.length > 0 && (
                <div>
                  <button onClick={() => setRawExpanded((v) => !v)}
                    className="flex items-center gap-2 text-xs text-gov-500 hover:text-gov-300 transition-colors mb-2">
                    <Layers size={12} />
                    {rawExpanded ? "Hide" : "Show"} {rawEntries.length} additional fields
                  </button>
                  {rawExpanded && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {rawEntries.map(([label, value]) => (
                        <div key={label} className="bg-gov-900/30 border border-gov-800/40 rounded-lg p-2.5">
                          <div className="text-gov-600 text-[10px] uppercase tracking-wide mb-0.5 truncate">{label}</div>
                          <div className="text-gov-300 text-xs">{value}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {activeTab === "notes" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gov-400 uppercase tracking-wider mb-2">
                  <FileText size={12} className="inline mr-1" /> Your Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={8}
                  placeholder="Add your observations, visit dates, contact notes, price quotes…"
                  className="w-full bg-gov-900/80 border border-gov-700/50 text-gray-100 placeholder-gov-600
                             rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gov-400
                             focus:ring-2 focus:ring-gov-400/20 resize-none transition-all"
                />
              </div>
              <button onClick={handleSaveNotes} className="btn-primary flex items-center gap-2 text-sm">
                <Save size={14} />
                {noteSaved ? "Saved!" : "Save Notes"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
