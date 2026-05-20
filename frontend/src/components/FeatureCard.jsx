import { cn } from '../lib/cn';

const iconColors = {
  blue: 'bg-gradient-to-br from-blue-700 to-blue-500 shadow-[0_4px_15px_rgba(59,130,246,0.3)]',
  purple: 'bg-gradient-to-br from-violet-700 to-purple-500 shadow-[0_4px_15px_rgba(168,85,247,0.3)]',
  gold: 'bg-gradient-to-br from-yellow-600 to-yellow-500 shadow-[0_4px_15px_rgba(234,179,8,0.3)]',
};

export default function FeatureCard({ icon, label, colorClass = 'blue' }) {
  const colorKey = colorClass.replace('feature-icon-', '') || 'blue';

  return (
    <div className="flex min-w-[5.5rem] max-w-[8.5rem] flex-1 cursor-default flex-col items-center gap-2 rounded-2xl p-3 transition-transform duration-300 hover:-translate-y-1 min-[480px]:gap-2.5 min-[480px]:p-5">
      <div
        className={cn(
          'flex h-12 w-12 items-center justify-center rounded-[14px] text-xl transition-all duration-300',
          iconColors[colorKey] || iconColors.blue
        )}
      >
        {icon}
      </div>
      <span className="text-center text-xs font-medium leading-snug text-white/70">{label}</span>
    </div>
  );
}
