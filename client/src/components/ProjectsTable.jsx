import { useState, useMemo } from "react";
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Download,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import StatusBadge from "./StatusBadge";

const PAGE_SIZE = 15;

const COLUMNS = [
  { key: "reraNumber", label: "RERA No.", mono: true },
  { key: "projectName", label: "Project Name" },
  { key: "promoterName", label: "Promoter" },
  { key: "lastModifiedDate", label: "Last Modified Date" },
  { key: "status", label: "Status" },
  { key: "approvedDate", label: "Approved Date" },
  { key: "proposedDateofCompletion", label: "Proposed Completion Date" },
  { key: "approvedBuildUpArea", label: "Approved Build Up Area (Sq Mts)" },
  { key: "netArea", label: "Net Area (Sq Mts)" },

];

export default function ProjectsTable({ projects = [] }) {
  const [sortKey, setSortKey] = useState("projectName");
  const [sortDir, setSortDir] = useState("asc");
  const [filterText, setFilterText] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [page, setPage] = useState(1);

  // Unique statuses for filter dropdown
  const statuses = useMemo(() => {
    const set = new Set(projects.map((p) => p.status).filter(Boolean));
    return Array.from(set).sort();
  }, [projects]);

  // Sort + filter
  const processed = useMemo(() => {
    let data = [...projects];

    if (filterText) {
      const q = filterText.toLowerCase();
      data = data.filter(
        (p) =>
          p.projectName?.toLowerCase().includes(q) ||
          p.promoterName?.toLowerCase().includes(q) ||
          p.reraNumber?.toLowerCase().includes(q) ||
          p.lastModifiedDate?.toLowerCase().includes(q)
      );
    }

    if (filterStatus) {
      data = data.filter((p) =>
        p.status?.toLowerCase().includes(filterStatus.toLowerCase())
      );
    }

    data.sort((a, b) => {
      const av = (a[sortKey] || "").toLowerCase();
      const bv = (b[sortKey] || "").toLowerCase();
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return data;
  }, [projects, filterText, filterStatus, sortKey, sortDir]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(processed.length / PAGE_SIZE));
  const paged = processed.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  }

  function SortIcon({ colKey }) {
    if (sortKey !== colKey)
      return <ChevronsUpDown size={12} className="text-gov-600 ml-1 shrink-0" />;
    return sortDir === "asc" ? (
      <ChevronUp size={12} className="text-gov-300 ml-1 shrink-0" />
    ) : (
      <ChevronDown size={12} className="text-gov-300 ml-1 shrink-0" />
    );
  }

  // CSV Export
  function exportCSV() {
    const headers = COLUMNS.map((c) => c.label).join(",");
    const rows = processed
      .map((p) =>
        COLUMNS.map((c) => {
          const v = p[c.key] || "";
          return `"${v.replace(/"/g, '""')}"`;
        }).join(",")
      )
      .join("\n");

    const blob = new Blob([headers + "\n" + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `telangana_rera_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (projects.length === 0) {
    return (
      <div className="card p-10 text-center">
        <div className="text-4xl mb-3">🏗️</div>
        <p className="text-gov-400 font-mono text-sm">No projects to display.</p>
        <p className="text-gov-600 text-xs mt-1">
          Search above to fetch Telangana RERA project data.
        </p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      {/* Table toolbar */}
      <div className="p-4 border-b border-gov-700/40 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Text filter */}
          <div className="relative">
            <Search
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gov-500"
            />
            <input
              type="text"
              placeholder="Filter results…"
              value={filterText}
              onChange={(e) => {
                setFilterText(e.target.value);
                setPage(1);
              }}
              className="bg-gov-900/60 border border-gov-700/40 rounded-lg pl-8 pr-3 py-1.5
                         text-xs text-gray-200 placeholder-gov-500 focus:outline-none
                         focus:border-gov-400 w-44"
            />
          </div>

          {/* Status filter */}
          {statuses.length > 0 && (
            <div className="relative">
              <Filter
                size={13}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gov-500"
              />
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setPage(1);
                }}
                className="bg-gov-900/60 border border-gov-700/40 rounded-lg pl-8 pr-3 py-1.5
                           text-xs text-gray-200 focus:outline-none focus:border-gov-400
                           appearance-none w-40"
              >
                <option value="">All Statuses</option>
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}

          <span className="text-gov-500 text-xs font-mono">
            {processed.length} record{processed.length !== 1 ? "s" : ""}
          </span>
        </div>

        <button onClick={exportCSV} className="btn-secondary flex items-center gap-2 text-xs">
          <Download size={13} />
          Export CSV
        </button>
      </div>

      {/* Scrollable table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gov-700/40 bg-gov-900/40">
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className="px-4 py-3 text-left text-xs font-semibold text-gov-400 uppercase
                             tracking-wider cursor-pointer hover:text-gov-200 select-none
                             whitespace-nowrap"
                >
                  <span className="flex items-center">
                    {col.label}
                    <SortIcon colKey={col.key} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gov-800/60">
            {paged.map((proj, idx) => (
              <tr key={proj._id || proj.reraNumber || idx} className="table-row-hover">
                <td className="px-4 py-3 font-mono text-xs text-amber-400 whitespace-nowrap">
                  {proj.reraNumber || "—"}
                </td>
                <td className="px-4 py-3 font-medium text-gray-100 max-w-[200px]">
                  <span className="line-clamp-2">{proj.projectName || "—"}</span>
                </td>
                <td className="px-4 py-3 text-gov-300 max-w-[180px]">
                  <span className="line-clamp-1">{proj.promoterName || "—"}</span>
                </td>
                <td className="px-4 py-3 text-gov-300 whitespace-nowrap">
                  {proj.lastModifiedDate || "—"}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <StatusBadge status={proj.status} />
                </td>
                <td className="px-4 py-3 text-gov-400 font-mono text-xs whitespace-nowrap">
                  {proj.approvedDate || "—"}
                </td>
                <td className="px-4 py-3 text-gov-400 font-mono text-xs whitespace-nowrap">
                  {proj.approvedBuildUpArea || "—"}
                </td>
                <td className="px-4 py-3 text-gov-400 font-mono text-xs whitespace-nowrap">
                  {proj.netArea || "—"}
                </td>
                <td className="px-4 py-3 text-gov-400 font-mono text-xs whitespace-nowrap">
                  {proj.proposedDateofCompletion || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-gov-700/40 flex items-center justify-between">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-secondary flex items-center gap-1 text-xs py-1.5"
          >
            <ChevronLeft size={13} />
            Prev
          </button>

          <span className="text-gov-400 text-xs font-mono">
            Page {page} of {totalPages}
          </span>

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="btn-secondary flex items-center gap-1 text-xs py-1.5"
          >
            Next
            <ChevronRight size={13} />
          </button>
        </div>
      )}
    </div>
  );
}