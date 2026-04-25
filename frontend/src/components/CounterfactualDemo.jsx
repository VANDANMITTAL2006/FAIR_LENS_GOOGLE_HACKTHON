import React from "react";

export default function CounterfactualDemo({ auditData = {} }) {
  const cf = auditData?.counterfactual || {};
  const status = cf?.status;

  if (status !== "ok") {
    return (
      <div className="w-full rounded-2xl border border-white/10 bg-[#071122] p-10 text-white shadow-xl">
        <h2 className="text-3xl font-bold">Counterfactual Bias Demo</h2>
        <p className="mt-3 text-gray-400">
          Upload a supported dataset to generate counterfactual analysis.
        </p>
      </div>
    );
  }

  const {
    attribute,
    original_group,
    counterfactual_group,
    original_score,
    counterfactual_score,
    delta,
  } = cf;

  return (
    <div className="w-full rounded-2xl border border-white/10 bg-[#071122] p-10 text-white shadow-xl space-y-8">
      <div>
        <h2 className="text-4xl font-bold">Counterfactual Bias Demo</h2>
        <p className="mt-2 text-gray-400">
          Compare outcomes before and after changing protected attributes.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-12">
        {/* Left Side */}
        <div className="space-y-4 xl:col-span-4">
          <InfoCard title="Protected Attribute" value={attribute} />
          <InfoCard title="Original Group" value={original_group} />
          <InfoCard title="Better Group" value={counterfactual_group} />
          <InfoCard title="Improvement" value={`+${delta}%`} highlight />
        </div>

        {/* Right Side */}
        <div className="xl:col-span-8 rounded-xl border border-white/10 bg-white/5 p-6 space-y-8">
          <h3 className="text-2xl font-semibold">Outcome Comparison</h3>

          <ScoreBar
            label={original_group}
            value={original_score}
            color="bg-rose-400"
          />

          <ScoreBar
            label={counterfactual_group}
            value={counterfactual_score}
            color="bg-emerald-400"
          />

          <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-5">
            <p className="text-sm text-gray-400">Fairness Gain</p>
            <p className="mt-2 text-4xl font-bold text-cyan-300">
              +{delta}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ title, value, highlight = false }) {
  return (
    <div
      className={`rounded-xl border p-5 ${
        highlight
          ? "border-emerald-400 bg-emerald-500/10"
          : "border-white/10 bg-white/5"
      }`}
    >
      <p className="text-sm text-gray-400">{title}</p>
      <p className="mt-2 text-xl font-semibold text-white">{value}</p>
    </div>
  );
}

function ScoreBar({ label, value, color }) {
  return (
    <div>
      <div className="mb-2 flex justify-between text-sm">
        <span className="text-gray-300">{label}</span>
        <span className="font-medium text-white">{value}%</span>
      </div>

      <div className="h-3 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full ${color}`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  );
}