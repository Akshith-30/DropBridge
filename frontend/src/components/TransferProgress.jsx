export default function TransferProgress({ value = 0, label = 'Progress' }) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between text-sm font-medium text-white/75">
        <span>{label}</span>
        <span aria-live="polite">{clamped}%</span>
      </div>
      <div
        className="h-2.5 w-full overflow-hidden rounded-[5px] bg-white/[0.06]"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-[5px] bg-gradient-to-r from-accent-blue via-accent-purple to-accent-green bg-[length:200%_100%] transition-[width] duration-300 animate-shimmer"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
