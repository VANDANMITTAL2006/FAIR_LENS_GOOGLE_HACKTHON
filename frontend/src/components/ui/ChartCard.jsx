const ChartCard = ({ title, subtitle, children, className = "" }) => {
  return (
    <div className={`rounded-2xl border border-slate-800 bg-slate-900/70 p-6 ${className}`}>
      {title && <h3 className="text-white text-lg font-semibold">{title}</h3>}
      {subtitle && <p className="text-slate-400 text-sm mt-1">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
};

export default ChartCard;