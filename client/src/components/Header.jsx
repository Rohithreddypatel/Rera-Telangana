import { ShieldCheck } from "lucide-react";

export default function Header() {
  return (
    <header className="sticky top-0 z-40 bg-gov-950/80 backdrop-blur-md border-b border-gov-700/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gov-700/50 border border-gov-600/40 flex items-center justify-center">
            <ShieldCheck size={16} className="text-gov-300" />
          </div>
          <div>
            <span className="font-display font-bold text-white text-sm">Telangana RERA</span>
            <span className="text-gov-500 text-xs ml-2 hidden sm:inline">/ Projects Dashboard</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-3 py-1.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
          Live Data
        </div>
      </div>
    </header>
  );
}
