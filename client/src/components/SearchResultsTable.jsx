import { useState } from "react";
import {
  BookmarkPlus, BookmarkCheck,
  ChevronUp, ChevronDown, ChevronsUpDown, Download,
} from "lucide-react";

const COLUMNS = [
  { key: "projectName",         label: "Project Name"               },
  { key: "promoterName",        label: "Promoter"                   },
  { key: "approvedBuildUpArea", label: "Build Up Area"              },
  { key: "netArea",             label: "Net Area"                   },
  { key: "fsi",                 label: "FSI",           computed: true },
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

export default function SearchResultsTable({ projects = [], savedSet, getProjectKey, onView, onSave }) {
  const [sortKey, setSortKey] = useState("projectName");
  const [sortDir, setSortDir] = useState("asc");
  const [q,       setQ]       = useState("");

  function handleSort(key) {
    setSortDir(sortKey === key ? (sortDir === "asc" ? "desc" : "asc") : "asc");
    setSortKey(key);
  }

  function SortIcon({ k }) {
    if (sortKey !== k) return <ChevronsUpDown size={11} className="text-gov-600 ml-1 shrink-0" />;
    return sortDir === "asc"
      ? <ChevronUp   size={11} className="text-gov-300 ml-1 shrink-0" />
      : <ChevronDown size={11} className="text-gov-300 ml-1 shrink-0" />;
  }

  const filtered = projects.filter((p) =>
    !q || [p.projectName, p.promoterName]
      .join(" ").toLowerCase().includes(q.toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => {
    let av, bv;
    if (sortKey === "fsi") {
      av = parseFloat(calcFSI(a)) || 0;
      bv = parseFloat(calcFSI(b)) || 0;
      return sortDir === "asc" ? av - bv : bv - av;
    }
    av = (a[sortKey] || "").toLowerCase();
    bv = (b[sortKey] || "").toLowerCase();
    if (av < bv) return sortDir === "asc" ? -1 : 1;
    if (av > bv) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  function exportCSV() {
    const headers = ["Project Name", "Promoter", "Build Up Area", "Net Area", "FSI"];
    const rows = sorted.map((p) => [
      p.projectName, p.promoterName,
      p.approvedBuildUpArea, p.netArea, calcFSI(p),
    ].map((v) => `"${(v || "").toString().replace(/"/g, '""')}"`).join(","));
    const csv  = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "search_results.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  if (!projects.length) {
    return (
      <div className="card p-10 text-center">
        <div className="text-4xl mb-3">🔍</div>
        <p className="text-gov-400 text-sm">No search results yet.</p>
        <p className="text-gov-600 text-xs mt-1">Enter a keyword and CAPTCHA above to fetch results.</p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="p-4 border-b border-gov-700/40 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <input type="text" value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Filter by name, promoter, RERA no…"
          className="input-field text-sm py-2 max-w-xs" />
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-gov-500">
            {filtered.length} of {projects.length} project{projects.length !== 1 ? "s" : ""}
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
                  <span className="flex items-center">{col.label}<SortIcon k={col.key} /></span>
                </th>
              ))}
              <th className="px-3 py-3 text-center text-[11px] font-semibold text-gov-400 uppercase tracking-wider w-24">Save</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gov-800/50">
            {sorted.map((proj, idx) => {
              const isSaved = savedSet.has(getProjectKey(proj));
              const fsi     = calcFSI(proj);
              return (
                <tr key={getProjectKey(proj) || idx}
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

                  <td className="px-3 py-3 text-center" onClick={(e) => { e.stopPropagation(); onSave(proj); }}>
                    <button
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                                  border transition-all duration-150 active:scale-95
                        ${isSaved
                          ? "bg-amber-500/20 text-amber-400 border-amber-500/40 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/40"
                          : "bg-gov-700/40 text-gov-300 border-gov-600/40 hover:bg-amber-500/20 hover:text-amber-400 hover:border-amber-500/40"
                        }`}
                      title={isSaved ? "Click to unsave" : "Save this project"}>
                      {isSaved
                        ? <><BookmarkCheck size={13} />Saved</>
                        : <><BookmarkPlus  size={13} />Save</>}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}