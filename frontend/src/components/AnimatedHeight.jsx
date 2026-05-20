import { useLayoutEffect, useRef, useState } from 'react';

/**
 * Smoothly animates height when children change size (mode switches, collapsible sections).
 */
export default function AnimatedHeight({ children, className = '', deps = [] }) {
  const innerRef = useRef(null);
  const [height, setHeight] = useState(null);

  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return undefined;

    const measure = () => {
      setHeight(el.scrollHeight);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [children, ...deps]);

  return (
    <div
      className={`animated-height ${className}`.trim()}
      style={height != null ? { height: `${height}px` } : undefined}
    >
      <div ref={innerRef} className="animated-height-inner">
        {children}
      </div>
    </div>
  );
}
