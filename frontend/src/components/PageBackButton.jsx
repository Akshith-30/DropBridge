import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/cn';

/**
 * Consistent back control for inner pages.
 * Uses browser history when possible, otherwise navigates to `fallback` (default `/`).
 */
export default function PageBackButton({
  to,
  onClick,
  fallback = '/',
  label = 'Back',
  className,
}) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
      return;
    }
    if (to) {
      navigate(to);
      return;
    }
    const idx = window.history.state?.idx;
    if (typeof idx === 'number' && idx > 0) {
      navigate(-1);
    } else {
      navigate(fallback);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'group inline-flex min-h-10 items-center gap-2 self-start rounded-lg px-1 py-1.5 text-sm font-medium text-white/55 transition-colors hover:bg-white/[0.04] hover:text-white',
        className
      )}
      aria-label={label === 'Back' ? 'Go back' : label}
    >
      <ArrowLeft
        className="h-4 w-4 shrink-0 transition-transform group-hover:-translate-x-0.5"
        aria-hidden
      />
      {label}
    </button>
  );
}
