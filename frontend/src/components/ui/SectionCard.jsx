const SectionCard = ({ title, subtitle, children, className = "" }) => {
  return (
    <section
      className={`rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl ${className}`}
    >
      {title && (
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          {subtitle && (
            <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
          )}
        </div>
      )}

      {children}
    </section>
  );
};

export default SectionCard;
