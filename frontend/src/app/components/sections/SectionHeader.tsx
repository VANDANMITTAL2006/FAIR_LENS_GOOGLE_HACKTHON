interface Props {
  eyebrow: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function SectionHeader({ eyebrow, title, description, action }: Props) {
  return (
    <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
      <div className="max-w-2xl">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-0.5 text-[11px] uppercase tracking-[0.14em] text-zinc-400">
          <span className="h-1 w-1 rounded-full bg-violet-400" />
          {eyebrow}
        </div>
        <h2 className="bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-[28px] leading-tight tracking-tight text-transparent lg:text-[34px]">
          {title}
        </h2>
        {description && (
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
