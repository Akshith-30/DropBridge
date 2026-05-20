import { useLayoutEffect, useRef, useState } from 'react';
import { cn } from '../lib/cn';

export default function TransferModeTabs({ mode, onModeChange }) {
  const containerRef = useRef(null);
  const sendRef = useRef(null);
  const receiveRef = useRef(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  const updateIndicator = () => {
    const active = mode === 'send' ? sendRef.current : receiveRef.current;
    if (!active) return;

    setIndicator({
      left: active.offsetLeft,
      width: active.offsetWidth,
    });
  };

  useLayoutEffect(() => {
    updateIndicator();
    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
  }, [mode]);

  const tabClass = (active) =>
    cn(
      'relative z-10 rounded-xl border-0 bg-transparent px-4 py-3 text-[0.9375rem] font-semibold transition-colors duration-200',
      active ? 'text-white' : 'text-white/65 hover:text-white/90'
    );

  return (
    <div
      className="relative mb-7 grid grid-cols-2 rounded-[0.875rem] bg-black/35 p-1.5"
      ref={containerRef}
      role="tablist"
      aria-label="Transfer mode"
    >
      <span
        className="pointer-events-none absolute top-1.5 bottom-1.5 left-0 z-0 rounded-xl bg-white/14 shadow-[0_2px_12px_rgba(0,0,0,0.35)] transition-[transform,width] duration-300 will-change-[transform,width]"
        style={{
          transform: `translateX(${indicator.left}px)`,
          width: indicator.width,
          transitionTimingFunction: 'cubic-bezier(0.34, 1.2, 0.64, 1)',
        }}
        aria-hidden
      />
      <button
        type="button"
        ref={sendRef}
        role="tab"
        aria-selected={mode === 'send'}
        className={tabClass(mode === 'send')}
        onClick={() => onModeChange('send')}
      >
        Send files
      </button>
      <button
        type="button"
        ref={receiveRef}
        role="tab"
        aria-selected={mode === 'receive'}
        className={tabClass(mode === 'receive')}
        onClick={() => onModeChange('receive')}
      >
        Receive files
      </button>
    </div>
  );
}
