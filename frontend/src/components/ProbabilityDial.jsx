import React from "react";

export default function ProbabilityDial({ value = 0 }) {
  const safe = Math.max(0, Math.min(100, Number(value) || 0));

  const color =
    safe < 40 ? "#ef4444" :
    safe < 70 ? "#f59e0b" :
    "#34d399";

  return (
    <div className="flex items-center gap-3">
      <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${safe}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-sm text-white w-12 text-right">{safe}%</span>
    </div>
  );
}