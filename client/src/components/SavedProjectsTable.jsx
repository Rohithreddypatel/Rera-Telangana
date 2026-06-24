import { useState } from "react";
import {
  BookmarkPlus, BookmarkCheck, BookmarkX,
  ChevronUp, ChevronDown, ChevronsUpDown,
  Download, Loader2,
} from "lucide-react";

const COLUMNS = [
  { key: "projectName",         label: "Project Name"                  },
  { key: "promoterName",        label: "Promoter"                      },
  { key: "approvedBuildUpArea", label: "Build Up Area"                 },
  { key: "netArea",             label: "Net Area"                      },
  { key: "fsi",                 label: "FSI",           computed: true },
  { key: "notes",               label: "Notes"                         },
];

function calcFSI(proj) {
  const bua = parseFloat(proj.approvedBuildUpArea);
  const net = parseFloat(proj.netArea);
  if (!bua || !net || net === 0) return "—";
  return (bua / net).toFixed(2);
}

function matchesStatus(projectStatus, filter) {
  if (!filter) return true;
  const ps = (projectStatus || "").toLowerCase().replace(/[-\s]/g, "");
  const f  = filter.toLowerCase().replace(/[-\s]/g, "");
  return ps.includes(f);
}

const PAGE_SIZE = 15;

function SortIcon({ col, sortKey, sortDir }) {
  if (sortKey !== col) return <ChevronsUpDown size={11} className="text-gov-600 ml-1 shrink-0" />;
  return sortDir === "asc"
    ? <ChevronUp   size={11} className="text-gov-300 ml-1 shrink-0" />
    : <ChevronDown size={11} className="text-gov-300 ml-1 shrink-0" />;
}

export default function SavedProjectsTable({
  projects = [], loading,
  savedSet, getProjectKey,
  onView, onSave, onUnsave,
}) {
  const [q,       setQ]       = useState("");
  const [sortKey, setSortKey] = useState("updatedAt");
  const [sortDir, setSortDir] = useState("desc");
  const [page,    setPage]    = useState(1);

  function handleSort(key) {
    setSortDir(sortKey === key ? (sortDir === "asc" ? "desc" : "asc") : "asc");
    setSortKey(key);
    setPage(1);
  }

  const filtered = projects.filter((p) =>
    !q || [p.projectName, p.promoterName]
      .join(" ").toLowerCase().includes(q.toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => {
    if (sortKey === "fsi") {
      const av = parseFloat(calcFSI(a)) || 0;
      const bv = parseFloat(calcFSI(b)) || 0;
      return sortDir === "asc" ? av - bv : bv - av;
    }
    if (sortKey === "updatedAt" || sortKey === "createdAt") {
      const av = new Date(a[sortKey] || 0).getTime();
      const bv = new Date(b[sortKey] || 0).getTime();
      return sortDir === "asc" ? av - bv : bv - av;
    }
    const av = String(a[sortKey] || "").toLowerCase();
    const bv = String(b[sortKey] || "").toLowerCase();
    if (av < bv) return sortDir === "asc" ? -1 : 1;
    if (av > bv) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageData   = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function exportCSV() {
    const headers = ["Project Name", "Promoter", "Build Up Area", "Net Area", "FSI", "Notes"];
    const rows = sorted.map((p) => [
      p.projectName, p.promoterName,
      p.approvedBuildUpArea, p.netArea, calcFSI(p), p.notes,
    ].map((v) => `"${(v || "").toString().replace(/"/g, '""')}"`).join(","));
    const csv  = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "saved_projects.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="card p-10 flex items-center justify-center gap-2 text-gov-400">
        <Loader2 size={20} className="animate-spin" />
        <span className="text-sm">Loading saved projects…</span>
      </div>
    );
  }

  if (!projects.length) {
    return (
      <div className="card p-12 text-center">
        <div className="text-4xl mb-3">🔖</div>
        <p className="text-gov-400 text-sm">No saved projects yet.</p>
        <p className="text-gov-600 text-xs mt-1">Search for projects and click the bookmark icon to save them here.</p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      {/* Toolbar */}
      <div className="p-4 border-b border-gov-700/40 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <input
          type="text" value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
          placeholder="Filter by name, promoter, RERA no…"
          className="input-field text-sm py-2 max-w-xs" />

        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-gov-500">
            {filtered.length} project{filtered.length !== 1 ? "s" : ""}
          </span>
          <button onClick={exportCSV}
            className="btn-secondary flex items-center gap-1.5 text-xs py-2">
            <Download size={13} /> Export CSV
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gov-700/40 bg-gov-900/40">
              {COLUMNS.map((col) => (
                <th key={col.key} onClick={() => handleSort(col.key)}
                  className="px-3 py-3 text-left text-[11px] font-semibold text-gov-400 uppercase
                             tracking-wider cursor-pointer hover:text-gov-200 select-none whitespace-nowrap">
                  <span className="flex items-center">
                    {col.label}
                    <SortIcon col={col.key} sortKey={sortKey} sortDir={sortDir} />
                  </span>
                </th>
              ))}
              <th className="px-3 py-3 text-center text-[11px] font-semibold text-gov-400 uppercase tracking-wider w-28">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gov-800/50">
            {pageData.map((proj, idx) => {
              const isSaved = savedSet ? savedSet.has(getProjectKey(proj)) : true;
              const fsi     = calcFSI(proj);
              return (
                <tr key={proj._id || getProjectKey(proj) || idx}
                  className="table-row-hover cursor-pointer"
                  onClick={() => onView(proj)}>

                  <td className="px-3 py-3 font-medium text-gray-100 max-w-[220px]">
                    <span className="line-clamp-2">{proj.projectName || "—"}</span>
                  </td>
                  <td className="px-3 py-3 text-gov-300 max-w-[180px]">
                    <span className="line-clamp-1">{proj.promoterName || "—"}</span>
                  </td>
                  <td className="px-3 py-3 text-gov-400 font-mono text-xs whitespace-nowrap">
                    {proj.approvedBuildUpArea || "—"}
                  </td>
                  <td className="px-3 py-3 text-gov-400 font-mono text-xs whitespace-nowrap">
                    {proj.netArea || "—"}
                  </td>

                  {/* FSI — highlighted badge */}
                  <td className="px-3 py-3 whitespace-nowrap">
                    {fsi === "—"
                      ? <span className="text-gov-600 text-xs">—</span>
                      : <span className="inline-flex items-center px-2 py-0.5 rounded-md
                                         bg-blue-500/15 text-blue-300 font-mono text-xs font-semibold
                                         border border-blue-500/25">
                          {fsi}
                        </span>
                    }
                  </td>

                  <td className="px-3 py-3 text-gov-500 text-xs max-w-[140px]">
                    <span className="line-clamp-2 italic">{proj.notes || "—"}</span>
                  </td>

                  {/* Actions */}
                  <td className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1.5 justify-center">
                      <button
                        onClick={() => onSave(proj)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold
                                    border transition-all duration-150 active:scale-95
                          ${isSaved
                            ? "bg-amber-500/20 text-amber-400 border-amber-500/40 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/40"
                            : "bg-gov-700/40 text-gov-300 border-gov-600/40 hover:bg-amber-500/20 hover:text-amber-400 hover:border-amber-500/40"
                          }`}
                        title={isSaved ? "Click to unsave" : "Save"}>
                        {isSaved ? <BookmarkCheck size={12} /> : <BookmarkPlus size={12} />}
                      </button>
                      <button
                        onClick={() => onUnsave(proj)}
                        className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20
                                   border border-red-500/30 transition-all"
                        title="Remove from saved">
                        <BookmarkX size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-gov-700/40 flex items-center justify-between">
          <span className="text-xs text-gov-500">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, sorted.length)} of {sorted.length}
          </span>
          <div className="flex gap-1.5">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40">← Prev</button>
            <span className="px-3 py-1.5 text-xs text-gov-400">{page}/{totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40">Next →</button>
          </div>
        </div>
      )}
    </div>
  );
}