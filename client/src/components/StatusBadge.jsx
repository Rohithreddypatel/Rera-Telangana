export default function StatusBadge({ status }) {
  if (!status) return <span className="status-badge text-gov-600 bg-gov-800/50 border-gov-700/40">—</span>;

  // FIX: normalize — handles "On-Going Project", "on-going project", "ongoing" etc.
  const s = status.toLowerCase().replace(/[-\s]/g, "");

  let cls = "";
  if (s.includes("ongoing") || s.includes("active") || s.includes("newproject")) {
    cls = "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
  } else if (s.includes("complet")) {
    cls = "text-blue-400 bg-blue-500/10 border-blue-500/30";
  } else if (s.includes("lapsed") || s.includes("expired") || s.includes("cancel")) {
    cls = "text-red-400 bg-red-500/10 border-red-500/30";
  } else {
    cls = "text-gov-400 bg-gov-800/50 border-gov-700/40";
  }

  return <span className={`status-badge ${cls}`}>{status}</span>;
}
