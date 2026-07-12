import { useNotifications } from '../context/NotificationContext';
import { X, AlertTriangle, CheckCircle2, Bell } from 'lucide-react';

const icons = {
  warning: AlertTriangle,
  success: CheckCircle2,
  info: Bell,
};

const styles = {
  warning: 'border-l-pastel-amber-deep bg-amber-50/90 text-amber-900',
  success: 'border-l-pastel-mint-deep bg-emerald-50/90 text-emerald-900',
  info: 'border-l-pink-400 bg-pink-50/90 text-pink-900',
};

export default function NotificationToast() {
  const { notifications, dismiss } = useNotifications();

  if (!notifications.length) return null;

  return (
    <div className="fixed top-4 right-4 left-4 sm:left-auto z-[60] flex flex-col gap-3 sm:w-96">
      {notifications.map((n) => {
        const Icon = icons[n.type] || Bell;
        return (
          <div
            key={n.id}
            className={`card-pastel p-4 border-l-4 shadow-soft-lg animate-slide-up ${styles[n.type] || styles.info}`}
            role="alert"
          >
            <div className="flex justify-between items-start gap-3">
              <div className="flex gap-3">
                <Icon size={20} strokeWidth={2.5} className="shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-sm">{n.title}</p>
                  <p className="text-sm mt-0.5 opacity-80">{n.message}</p>
                </div>
              </div>
              <button
                onClick={() => dismiss(n.id)}
                className="p-1 rounded-lg hover:bg-black/5 transition-colors shrink-0"
                aria-label="Cerrar"
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
