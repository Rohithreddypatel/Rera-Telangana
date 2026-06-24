import { useEffect, useState } from "react";
import { Building2, CheckCircle2, Clock, MapPin, Bookmark } from "lucide-react";
import { getProjectStats } from "../services/api";

// FIX: StatsBar now fetches real totals from DB via /api/projects/stats
// instead of only counting the current search result (which was always 1)
export default function StatsBar() {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProjectStats()
      .then((data) => { if (data.success) setStats(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="card p-4 h-16 animate-pulse bg-gov-800/40" />
      ))}
    </div>
  );

  if (!stats) return null;

  // Compute ongoing / completed from byStatus array
  const byStatus   = stats.byStatus || [];
  const getCount   = (keyword) =>
    byStatus
      .filter((s) => (s._id || "").toLowerCase().includes(keyword))
      .reduce((sum, s) => sum + s.count, 0);

  const ongoing    = getCount("ongoing") + getCount("on-going");
  const completed  = getCount("complet");
  const districts  = (stats.byDistrict || []).length;

  const cards = [
    { label: "Total Projects", value: stats.total    || 0, icon: Building2,   color: "text-gov-300",    bg: "bg-gov-800/40"      },
    { label: "Ongoing",        value: ongoing,              icon: Clock,        color: "text-emerald-400", bg: "bg-emerald-500/10"  },
    { label: "Completed",      value: completed,            icon: CheckCircle2, color: "text-blue-400",    bg: "bg-blue-500/10"     },
    { label: "Saved",          value: stats.savedCount || 0,icon: Bookmark,     color: "text-amber-400",   bg: "bg-amber-500/10"    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {cards.map(({ label, value, icon: Icon, color, bg }) => (
        <div key={label} className={`card p-4 flex items-center gap-3 ${bg} border-gov-700/30`}>
          <div className={`${color} shrink-0`}><Icon size={20} /></div>
          <div>
            <div className={`text-xl font-display font-bold ${color}`}>{value}</div>
            <div className="text-gov-500 text-xs">{label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
