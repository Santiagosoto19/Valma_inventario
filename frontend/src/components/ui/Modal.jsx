import { X } from 'lucide-react';

export default function Modal({ open, onClose, title, children, size = 'md' }) {
  if (!open) return null;

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" />
      <div
        className={`relative w-full ${sizes[size]} bg-white rounded-t-3xl sm:rounded-3xl shadow-soft-lg
          max-h-[92vh] overflow-y-auto animate-scale-in`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between p-5 sm:p-6 border-b border-pastel-lavender/30 sticky top-0 bg-white/95 backdrop-blur-sm rounded-t-3xl z-10">
            <h3 className="text-lg font-bold text-slate-800">{title}</h3>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-pastel-lavender/30 transition-colors"
              aria-label="Cerrar"
            >
              <X size={20} strokeWidth={2} className="text-slate-500" />
            </button>
          </div>
        )}
        <div className="p-5 sm:p-6">{children}</div>
      </div>
    </div>
  );
}
