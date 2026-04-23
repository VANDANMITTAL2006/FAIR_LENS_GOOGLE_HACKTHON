const ProgressBar = ({
  value = 0,
  max = 100,
  className = "",
}) => {
  const percentage = Math.max(
    0,
    Math.min(100, (value / max) * 100)
  );

  return (
    <div className={className}>
      <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;