import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Loader2, ArrowRight } from 'lucide-react';
import Button from './ui/Button';
import { cn } from '../lib/cn';

const OPTIONS = [
  { id: 'direct', label: 'Direct transfer' },
  { id: 'stored', label: 'Transfer using link' },
];

const BUTTON_LABELS = {
  direct: { idle: 'Transfer', loading: 'Transferring…' },
  stored: { idle: 'Get download link', loading: 'Preparing link…' },
};

export default function TransferActionButton({
  method,
  onMethodChange,
  onSubmit,
  disabled,
  loading,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const labels = BUTTON_LABELS[method] || BUTTON_LABELS.direct;

  return (
    <div className="relative mt-2 flex w-full" ref={rootRef}>
      <Button
        type="button"
        onClick={onSubmit}
        disabled={disabled || loading}
        className="min-h-12 flex-1 !rounded-r-none justify-center"
        id="start-transfer-btn"
      >
        <span className="inline-flex animate-content-enter items-center gap-2" key={loading ? 'loading' : method}>
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              {labels.loading}
            </>
          ) : (
            <>
              {labels.idle}
              <ArrowRight className="h-5 w-5" aria-hidden />
            </>
          )}
        </span>
      </Button>
      <button
        type="button"
        className="flex min-w-12 items-center justify-center rounded-r-xl border-0 border-l border-white/15 bg-gradient-to-br from-blue-600 to-violet-700 text-white transition-[filter] duration-200 hover:brightness-110"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Choose transfer type"
      >
        <ChevronDown
          className={cn('h-5 w-5 transition-transform duration-300 ease-out', open && 'rotate-180')}
        />
      </button>

      <ul
        className={cn(
          'absolute bottom-[calc(100%+0.5rem)] left-0 right-0 z-20 m-0 list-none rounded-[0.875rem] border border-white/12 bg-[rgba(18,18,24,0.98)] p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.45)] origin-bottom transition-[opacity,transform,visibility] duration-300',
          open
            ? 'visible translate-y-0 scale-100 opacity-100'
            : 'invisible translate-y-2 scale-[0.98] opacity-0 pointer-events-none'
        )}
        role="listbox"
        aria-hidden={!open}
      >
        {OPTIONS.map((opt) => (
          <li key={opt.id}>
            <button
              type="button"
              role="option"
              aria-selected={method === opt.id}
              tabIndex={open ? 0 : -1}
              className={cn(
                'flex w-full items-center rounded-[0.625rem] border-0 px-4 py-3.5 text-left text-[0.9375rem] font-semibold text-white transition-colors duration-150',
                method === opt.id ? 'bg-accent-blue/15' : 'bg-transparent hover:bg-white/6'
              )}
              onClick={() => {
                onMethodChange(opt.id);
                setOpen(false);
              }}
            >
              {opt.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
