const styles = {
  success: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  warning: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  danger: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  info: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
};

const StatusBadge = ({
  label,
  variant = "info",
  className = "",
}) => {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${styles[variant]} ${className}`}
    >
      {label}
    </span>
  );
};

export default StatusBadge;