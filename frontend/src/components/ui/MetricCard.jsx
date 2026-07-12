import { formatCurrency } from '../../services/api';

const variants = {
  cash: {
    bg: 'bg-gradient-to-br from-pastel-cash to-emerald-50',
    border: 'border-pastel-cash-deep/40',
    iconBg: 'bg-emerald-200/60',
    text: 'text-emerald-800',
    amount: 'text-emerald-900',
  },
  nequi: {
    bg: 'bg-gradient-to-br from-pastel-nequi to-indigo-50',
    border: 'border-pastel-nequi-deep/40',
    iconBg: 'bg-indigo-200/60',
    text: 'text-indigo-800',
    amount: 'text-indigo-900',
  },
  total: {
    bg: 'bg-gradient-to-br from-pink-100 via-pastel-lavender to-violet-100',
    border: 'border-pink-200/60',
    iconBg: 'bg-pink-200/60',
    text: 'text-pink-800',
    amount: 'text-pink-900',
  },
  default: {
    bg: 'bg-white',
    border: 'border-pastel-lavender/40',
    iconBg: 'bg-pastel-lavender/50',
    text: 'text-slate-600',
    amount: 'text-slate-900',
  },
};

export default function MetricCard({
  title,
  amount,
  transactions,
  icon: Icon,
  variant = 'default',
  subtitle,
}) {
  const v = variants[variant] || variants.default;

  return (
    <div
      className={`card-pastel p-5 sm:p-6 border-2 ${v.bg} ${v.border} transition-all duration-300 hover:shadow-soft hover:scale-[1.01]`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${v.text} uppercase tracking-wide`}>{title}</p>
          <p className={`text-3xl sm:text-4xl font-extrabold mt-2 ${v.amount} tracking-tight`}>
            {formatCurrency(amount)}
          </p>
          {transactions !== undefined && (
            <p className={`text-xs mt-2 font-medium ${v.text} opacity-80`}>
              {transactions} transacción{transactions !== 1 ? 'es' : ''}
            </p>
          )}
          {subtitle && (
            <p className={`text-xs mt-1 ${v.text} opacity-70`}>{subtitle}</p>
          )}
        </div>
        {Icon && (
          <div className={`p-3 rounded-2xl ${v.iconBg} shrink-0`}>
            <Icon size={28} strokeWidth={2} className={v.text} />
          </div>
        )}
      </div>
    </div>
  );
}
