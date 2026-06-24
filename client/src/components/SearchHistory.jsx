import { Clock, X } from "lucide-react";

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export default function SearchHistory({ history = [], onSelect, onClear }) {
  if (!history.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Clock size={12} className="text-gov-600 shrink-0" />
      {history.slice(0, 8).map((h, i) => (
        <button key={i} onClick={() => onSelect(h)}
          className="px-2.5 py-1 rounded-lg bg-gov-800/50 border border-gov-600/30
                     text-xs text-gov-400 hover:text-white hover:bg-gov-700/50 transition-all">
          {h.params?.query || h.query || "(advanced)"}
          <span className="text-gov-700 ml-1.5">{timeAgo(h.timestamp)}</span>
        </button>
      ))}
      <button onClick={onClear}
        className="flex items-center gap-1 text-[11px] text-gov-700 hover:text-red-400 transition-colors">
        <X size={10} />clear
      </button>
    </div>
  );
}
