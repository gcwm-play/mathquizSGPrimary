import React from "react";

export function Owl({ children, mood = "happy" }) {
  const face = mood === "party" ? "🦉🎉" : "🦉";
  return (
    <div className="flex items-end gap-3">
      <div className="text-5xl cv-bob select-none" aria-hidden="true">
        {face}
      </div>
      <div className="relative bg-white rounded-2xl rounded-bl-none shadow-md px-4 py-3 text-slate-800 flex-1">
        {children}
      </div>
    </div>
  );
}
