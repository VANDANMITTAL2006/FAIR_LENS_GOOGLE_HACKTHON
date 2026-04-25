import React from "react";

export default function ProgressBar({ value = 0 }) {
  const safe = Math.max(0, Math.min(100, Number(value) || 0));

  return (
    <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
      <div
        className="h-full bg-cyan-400 transition-all duration-500"
        style={{ width: `${safe}%` }}
      />
    </div>
  );
}