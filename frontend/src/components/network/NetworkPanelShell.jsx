import { Users, X } from 'lucide-react';

export default function NetworkPanelShell({ subtitle, onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-[200] flex animate-overlay-in justify-end bg-black/55 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <aside
        className="flex h-full w-full max-w-[22rem] animate-panel-in flex-col border-l border-white/10 bg-[rgba(12,12,18,0.98)] shadow-[-12px_0_48px_rgba(0,0,0,0.45)]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="network-panel-title"
        aria-modal="true"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-white/8 px-5 pb-4 pt-5">
          <div className="flex items-start gap-3">
            <Users className="mt-0.5 h-7 w-7 shrink-0 text-accent-blue" aria-hidden />
            <div>
              <h2 id="network-panel-title" className="m-0 text-xl font-bold text-white">
                My network
              </h2>
              <p className="mt-1 text-[0.8125rem] text-white/50">{subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            className="flex items-center justify-center rounded-lg border-0 bg-white/6 p-1.5 text-white/70 transition-colors hover:bg-white/12 hover:text-white"
            onClick={onClose}
            aria-label="Close network panel"
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        {children}
      </aside>
    </div>
  );
}
