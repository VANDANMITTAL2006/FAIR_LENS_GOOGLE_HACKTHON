const MetricCard = ({
  label,
  value,
  helper,
  className = "",
}) => {
  return (
    <div className={`rounded-2xl border border-slate-800 bg-slate-900/60 p-5 ${className}`}>
      <p className="text-sm text-slate-400">{label}</p>
      <h3 className="mt-2 text-3xl font-bold text-white">{value}</h3>
      {helper && <p className="mt-2 text-sm text-slate-500">{helper}</p>}
    </div>
  );
};

export default MetricCard;