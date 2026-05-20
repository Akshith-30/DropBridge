import { useMemo } from 'react';
import { cn } from '../lib/cn';

export default function BackgroundEffects() {
  const stars = useMemo(() => {
    return Array.from({ length: 50 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      delay: `${Math.random() * 5}s`,
      size: `${1 + Math.random() * 2}px`,
    }));
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      <div
        className={cn(
          'absolute top-1/2 -left-1/2 h-0.5 w-[200%] origin-center opacity-30',
          'bg-gradient-to-r from-transparent via-accent-cyan to-transparent',
          'animate-ray-sweep -rotate-3'
        )}
      />
      <div
        className={cn(
          'absolute top-1/2 -left-1/2 h-0.5 w-[200%] origin-center opacity-20 rotate-2',
          'bg-gradient-to-r from-transparent via-accent-purple to-transparent',
          'animate-ray-sweep-2'
        )}
      />
      <div
        className={cn(
          'absolute top-1/2 -left-1/2 h-0.5 w-[200%] origin-center opacity-15 -rotate-1',
          'bg-gradient-to-r from-transparent via-accent-green to-transparent',
          'animate-ray-sweep-3'
        )}
      />

      <div className="absolute top-1/2 left-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 animate-glow-pulse rounded-full bg-[radial-gradient(circle,rgba(34,197,94,0.08)_0%,rgba(168,85,247,0.04)_40%,transparent_70%)]" />

      <div className="perspective-grid" />

      {stars.map((star) => (
        <div
          key={star.id}
          className="absolute animate-twinkle rounded-full bg-white"
          style={{
            left: star.left,
            top: star.top,
            animationDelay: star.delay,
            width: star.size,
            height: star.size,
          }}
        />
      ))}
    </div>
  );
}
