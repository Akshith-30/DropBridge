import { ChevronRight } from 'lucide-react';
import { cn } from '../../lib/cn';

export default function NetworkActionCard({ icon: Icon, title, subtitle, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3.5 rounded-xl border border-white/10 bg-white/[0.04] p-4 text-left',
        'transition-colors hover:border-white/18 hover:bg-white/[0.08]'
      )}
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/8 text-white/85">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[0.9375rem] font-semibold text-white">{title}</span>
        <span className="mt-0.5 block text-sm text-white/50">{subtitle}</span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-white/30" aria-hidden />
    </button>
  );
}
