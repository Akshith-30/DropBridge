import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from '../lib/cn';

/**
 * Compact breadcrumb for shallow hierarchies (e.g. Home / Send history / title).
 * @param {{ label: string, to?: string, onClick?: () => void, current?: boolean }[]} items
 */
export default function Breadcrumb({ items, className }) {
  if (!items?.length) return null;

  return (
    <nav aria-label="Breadcrumb" className={cn('min-w-0', className)}>
      <ol className="m-0 flex list-none flex-wrap items-center gap-1 p-0 text-sm">
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-1">
            {index > 0 && (
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-white/30" aria-hidden />
            )}
            {item.current ? (
              <span
                className="max-w-[14rem] truncate font-medium text-white/90"
                aria-current="page"
              >
                {item.label}
              </span>
            ) : item.to ? (
              <Link
                to={item.to}
                className="text-white/55 no-underline transition-colors hover:text-white"
              >
                {item.label}
              </Link>
            ) : (
              <button
                type="button"
                onClick={item.onClick}
                className="border-0 bg-transparent p-0 text-white/55 transition-colors hover:text-white"
              >
                {item.label}
              </button>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
