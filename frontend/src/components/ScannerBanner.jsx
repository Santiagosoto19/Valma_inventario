import { ScanLine, Unplug, Usb } from 'lucide-react';
import { useScanner } from '../context/ScannerContext';

export default function ScannerBanner() {
  const {
    connected,
    deviceName,
    checking,
    canPair,
    pairing,
    pairScanner,
  } = useScanner();

  if (checking && connected === null) {
    return (
      <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-600">
        <ScanLine size={18} className="shrink-0 animate-pulse" />
        <p className="font-bold text-sm">Buscando lector USB…</p>
      </div>
    );
  }

  if (connected) {
    return (
      <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900">
        <Usb size={18} className="shrink-0" />
        <div className="min-w-0">
          <p className="font-bold text-sm">Lector USB conectado</p>
          <p className="text-xs font-medium truncate">
            {deviceName || 'Listo para escanear en Linux y Windows'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4 flex items-start gap-3 px-4 py-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900">
      <Unplug size={18} className="shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1">
        <p className="font-bold text-sm">Lector USB desconectado</p>
        <p className="text-xs font-medium mt-0.5">
          Enchufa el lector. Si el aviso no cambia, usa Chrome o Edge y vincúlalo una vez.
        </p>
      </div>
      {canPair && (
        <button
          type="button"
          onClick={() => pairScanner().catch(() => undefined)}
          disabled={pairing}
          className="text-xs font-bold px-3 py-1.5 rounded-xl bg-white border border-rose-200 shrink-0"
        >
          {pairing ? 'Esperando…' : 'Vincular'}
        </button>
      )}
    </div>
  );
}
