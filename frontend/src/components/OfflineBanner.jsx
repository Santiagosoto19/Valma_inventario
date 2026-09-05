import { CloudOff, Loader2, RefreshCw, Wifi, X } from 'lucide-react';
import { formatCurrency } from '../services/api';
import { useOffline } from '../context/OfflineContext';

export default function OfflineBanner() {
  const {
    online,
    pendingCount,
    failed,
    syncing,
    syncQueue,
    dismissFailed,
    retryFailed,
  } = useOffline();

  if (online && pendingCount === 0 && failed.length === 0 && !syncing) {
    return null;
  }

  return (
    <div className="space-y-2 mb-4">
      {!online && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900">
          <CloudOff size={18} className="shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="font-bold text-sm">Sin internet</p>
            <p className="text-xs font-medium mt-0.5">
              Puedes seguir vendiendo. Las ventas quedan en este dispositivo y se guardan solas cuando vuelva la red.
            </p>
          </div>
        </div>
      )}

      {(pendingCount > 0 || syncing) && online && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-sky-50 border border-sky-200 text-sky-900">
          {syncing ? (
            <Loader2 size={18} className="shrink-0 animate-spin" />
          ) : (
            <Wifi size={18} className="shrink-0" />
          )}
          <p className="flex-1 font-bold text-sm">
            {syncing
              ? `Sincronizando ${pendingCount || ''} venta${pendingCount === 1 ? '' : 's'}...`
              : `${pendingCount} venta${pendingCount === 1 ? '' : 's'} en cola`}
          </p>
          {!syncing && (
            <button
              type="button"
              onClick={syncQueue}
              className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl bg-white border border-sky-200"
            >
              <RefreshCw size={12} /> Enviar
            </button>
          )}
        </div>
      )}

      {failed.map((item) => (
        <div
          key={item.id}
          className="flex items-start gap-3 px-4 py-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900"
        >
          <div className="min-w-0 flex-1">
            <p className="font-bold text-sm">Venta de la cola no se guardó</p>
            <p className="text-xs font-medium mt-0.5">
              {item.error || 'Error desconocido'}
              {item.preview?.total != null && ` — ${formatCurrency(item.preview.total)}`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => retryFailed(item.id)}
            className="text-xs font-bold px-3 py-1.5 rounded-xl bg-white border border-rose-200 shrink-0"
          >
            Reintentar
          </button>
          <button
            type="button"
            onClick={() => dismissFailed(item.id)}
            className="p-1.5 rounded-xl hover:bg-rose-100 shrink-0"
            aria-label="Descartar"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
