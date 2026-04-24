import { forwardRef } from 'react';

const base =
  'inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition ' +
  'focus-ring disabled:opacity-50 disabled:pointer-events-none';

const variants = {
  primary: 'bg-primary text-background hover:opacity-90 shadow-glow',
  secondary: 'bg-white/[0.06] text-on-surface border border-white/10 hover:bg-white/[0.08]',
  ghost: 'bg-transparent text-on-surface hover:bg-white/[0.06] border border-transparent hover:border-white/10',
  danger: 'bg-error-container/30 text-error border border-error/30 hover:bg-error-container/40 shadow-glow-red',
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs rounded-lg',
  md: 'px-3.5 py-2 text-sm rounded-xl',
  lg: 'px-4 py-2.5 text-sm rounded-xl',
};

export const Button = forwardRef(function Button(
  { as: Comp = 'button', variant = 'secondary', size = 'md', className = '', ...props },
  ref
) {
  return (
    <Comp
      ref={ref}
      className={`${base} ${variants[variant] || variants.secondary} ${sizes[size] || sizes.md} ${className}`}
      {...props}
    />
  );
});

