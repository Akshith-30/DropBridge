import { cn } from '../../lib/cn';

const variants = {
  primary:
    'inline-flex items-center justify-center gap-2 rounded-xl border-0 bg-gradient-to-br from-accent-blue to-accent-purple px-7 py-3 text-[0.95rem] font-semibold text-white cursor-pointer transition-all duration-300 hover:not-disabled:-translate-y-0.5 hover:not-disabled:shadow-[0_8px_30px_rgba(59,130,246,0.3)] active:not-disabled:translate-y-0 active:not-disabled:scale-[0.98] disabled:opacity-45 disabled:cursor-not-allowed',
  outline:
    'inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-transparent px-7 py-3 text-[0.95rem] font-medium text-white cursor-pointer transition-all duration-300 hover:not-disabled:-translate-y-0.5 hover:not-disabled:border-white/30 hover:not-disabled:bg-white/6',
  accent:
    'inline-flex items-center justify-center gap-2 rounded-xl border border-accent-pink bg-transparent px-7 py-3 text-[0.95rem] font-medium text-accent-pink cursor-pointer transition-all duration-300 hover:not-disabled:-translate-y-0.5 hover:not-disabled:bg-accent-pink/10 hover:not-disabled:shadow-[0_8px_30px_rgba(236,72,153,0.2)]',
  ghost:
    'inline-flex items-center justify-center gap-2 rounded-xl border-0 bg-transparent px-5 py-3 text-[0.9375rem] font-medium text-white/65 cursor-pointer transition-colors duration-200 hover:text-white hover:bg-white/6 min-h-11',
  icon: 'inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/6 p-2.5 text-white/70 cursor-pointer transition-colors duration-200 hover:border-white/20 hover:bg-white/10 hover:text-white',
  nav: 'inline-flex items-center justify-center min-h-10 whitespace-nowrap px-3 py-2 text-[0.8125rem] leading-tight sm:min-h-[2.625rem] sm:px-[1.125rem] sm:text-sm',
};

export default function Button({
  variant = 'primary',
  className,
  type = 'button',
  children,
  ...props
}) {
  return (
    <button type={type} className={cn(variants[variant], className)} {...props}>
      {children}
    </button>
  );
}
