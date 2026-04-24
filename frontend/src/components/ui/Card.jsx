export function Card({ className = '', children, ...props }) {
  return (
    <section className={`glass rounded-2xl ${className}`} {...props}>
      {children}
    </section>
  );
}

export function CardHeader({ title, subtitle, right, className = '' }) {
  return (
    <header className={`flex items-start justify-between gap-4 ${className}`}>
      <div className="min-w-0">
        {title && <h2 className="text-sm font-semibold text-on-surface truncate">{title}</h2>}
        {subtitle && <p className="mt-1 text-xs text-on-surface-variant">{subtitle}</p>}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </header>
  );
}

export function CardBody({ className = '', children }) {
  return <div className={className}>{children}</div>;
}

