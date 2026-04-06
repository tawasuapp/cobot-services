import { TrendingUp, TrendingDown } from 'lucide-react';

export default function KPICard({ title, value, icon: Icon, trend, color = 'blue', subtitle }) {
  const palettes = {
    blue:   { bg: 'bg-blue-50',   icon: 'text-blue-600',   border: 'border-blue-100' },
    green:  { bg: 'bg-emerald-50', icon: 'text-emerald-600', border: 'border-emerald-100' },
    orange: { bg: 'bg-orange-50',  icon: 'text-orange-600',  border: 'border-orange-100' },
    red:    { bg: 'bg-red-50',     icon: 'text-red-600',     border: 'border-red-100' },
    purple: { bg: 'bg-violet-50',  icon: 'text-violet-600',  border: 'border-violet-100' },
    cyan:   { bg: 'bg-cyan-50',    icon: 'text-cyan-600',    border: 'border-cyan-100' },
  };

  const p = palettes[color] || palettes.blue;

  return (
    <div className={`bg-white rounded-2xl border ${p.border} p-4 sm:p-5 hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">{title}</span>
        {Icon && (
          <div className={`p-2 rounded-xl ${p.bg}`}>
            <Icon size={18} className={p.icon} />
          </div>
        )}
      </div>
      <p className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">{value ?? '—'}</p>
      {(trend != null || subtitle) && (
        <div className="mt-1.5 flex items-center gap-1.5">
          {trend != null && (
            <>
              {trend > 0 ? <TrendingUp size={14} className="text-emerald-500" /> : <TrendingDown size={14} className="text-red-500" />}
              <span className={`text-xs font-semibold ${trend > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {trend > 0 ? '+' : ''}{trend}%
              </span>
            </>
          )}
          {subtitle && <span className="text-xs text-gray-400">{subtitle}</span>}
        </div>
      )}
    </div>
  );
}
