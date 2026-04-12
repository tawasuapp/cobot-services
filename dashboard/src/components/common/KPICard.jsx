import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

/**
 * Solid-badge KPI card matching the new design system.
 *
 * Props:
 *  - title: short uppercase label
 *  - value: main metric (number / formatted string)
 *  - icon: lucide icon component (rendered inside a colored badge)
 *  - color: badge color key — green, indigo, orange, purple, pink, red, blue, cyan
 *  - trend: signed number, displayed as "+12.5%" / "-2.1%" with arrow & color
 *  - trendLabel: optional secondary text, e.g. "from last month"
 *  - subtitle: optional small caption beneath the value
 *  - children: optional content (e.g. inline progress bar)
 */
export default function KPICard({
  title, value, icon: Icon, color = 'indigo', trend, trendLabel,
  subtitle, children,
}) {
  const badges = {
    indigo: 'bg-indigo-600',
    green:  'bg-emerald-500',
    orange: 'bg-orange-500',
    purple: 'bg-violet-500',
    pink:   'bg-pink-500',
    red:    'bg-red-500',
    blue:   'bg-blue-500',
    cyan:   'bg-cyan-500',
  };
  const badge = badges[color] || badges.indigo;

  const trendUp = trend != null && trend >= 0;
  const trendColor = trendUp ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50';

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{title}</span>
        {Icon && (
          <div className={`w-9 h-9 rounded-xl ${badge} flex items-center justify-center shadow-sm`}>
            <Icon size={18} className="text-white" />
          </div>
        )}
      </div>
      <p className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">{value ?? '—'}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      {trend != null && (
        <div className="mt-3 flex items-center gap-1.5">
          <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[11px] font-semibold ${trendColor}`}>
            {trendUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {trendUp ? '+' : ''}{trend}%
          </span>
          {trendLabel && <span className="text-[11px] text-gray-400">{trendLabel}</span>}
        </div>
      )}
      {children}
    </div>
  );
}
