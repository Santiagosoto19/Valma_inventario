import { useState } from 'react';
import { Sparkles } from 'lucide-react';

const LOGO_SRC = import.meta.env.VITE_LOGO_URL || '/logo.png';

const sizes = {
  sm: { box: 'h-8 w-8', icon: 16 },
  md: { box: 'h-10 w-10', icon: 20 },
  lg: { box: 'h-14 w-14', icon: 28 },
  xl: { box: 'h-20 w-20', icon: 32 },
};

export default function Logo({ size = 'md', className = '', rounded = 'rounded-xl' }) {
  const [imgError, setImgError] = useState(false);
  const [src, setSrc] = useState(LOGO_SRC);
  const s = sizes[size] || sizes.md;

  function handleError() {
    if (src === '/logo.png') {
      setSrc('/logo.svg');
    } else {
      setImgError(true);
    }
  }

  if (imgError) {
    return (
      <div className={`${s.box} flex items-center justify-center bg-gradient-to-br from-pink-400 to-violet-400 ${rounded} ${className}`}>
        <Sparkles size={s.icon} className="text-white" strokeWidth={2.5} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt="Valma Inventario"
      className={`${s.box} object-contain ${rounded} ${className}`}
      onError={handleError}
    />
  );
}
