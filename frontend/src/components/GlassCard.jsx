import { cn } from '../lib/cn';

export default function GlassCard({ children, className = '', ...props }) {
  return (
    <div
      className={cn(
        'rounded-3xl border border-white/10 bg-white/[0.06] backdrop-blur-[40px]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
