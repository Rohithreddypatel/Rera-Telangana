import { Loader2, RefreshCw, AlertCircle, ShieldAlert } from "lucide-react";

export default function CaptchaBox({ captchaImage, captchaLoading, captchaError, onRefresh, value, onChange }) {
  if (captchaLoading) {
    return (
      <div className="flex items-center gap-2 h-10 text-gov-400">
        <Loader2 size={16} className="animate-spin" />
        <span className="text-sm">Loading CAPTCHA…</span>
      </div>
    );
  }

  if (captchaError) {
    return (
      <div className="space-y-2">
        <div className="flex items-start gap-2 text-red-400 text-xs">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <span>{captchaError}</span>
        </div>
        <button type="button" onClick={onRefresh}
          className="btn-secondary flex items-center gap-1.5 text-xs py-1.5">
          <RefreshCw size={12} /> Retry
        </button>
      </div>
    );
  }

  if (!captchaImage) {
    return (
      <div className="flex items-center gap-2 text-gov-500 h-10">
        <ShieldAlert size={16} />
        <span className="text-xs">Click "Load CAPTCHA" to continue.</span>
      </div>
    );
  }

  return (
    <div className="flex items-stretch gap-3">
      {/* CAPTCHA image */}
      <div className="relative flex items-center justify-center bg-white rounded-xl overflow-hidden shrink-0 w-32 h-12 border border-gov-600/30">
        <img src={captchaImage} alt="CAPTCHA" className="w-full h-full object-contain" />
      </div>

      {/* Refresh + Input */}
      <div className="flex-1 flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Type CAPTCHA here"
            value={value}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            className="input-field flex-1 py-1.5 text-sm font-mono tracking-widest uppercase"
            autoComplete="off"
          />
          <button type="button" onClick={onRefresh} title="Reload CAPTCHA"
            className="btn-secondary p-2 shrink-0">
            <RefreshCw size={13} />
          </button>
        </div>
        <p className="text-gov-600 text-[10px]">Case-insensitive • Enter exactly what you see</p>
      </div>
    </div>
  );
}
