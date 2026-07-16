import { useState } from 'react';
import { Package } from 'lucide-react';
import { getImageUrl } from '../../services/api';

export default function ProductImage({
  src,
  alt = 'Producto',
  className = 'w-full aspect-[4/3]',
  fit = 'contain',
  iconSize = 40,
  rounded = 'rounded-none',
}) {
  const [error, setError] = useState(false);
  const url = src ? getImageUrl(src) : null;
  const fitClass = fit === 'cover' ? 'object-cover object-center' : 'object-contain object-center';

  if (!url || error) {
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br from-pastel-lavender/20 to-pink-50 overflow-hidden ${rounded} ${className}`}
      >
        <Package size={iconSize} className="text-pastel-lavender-deep" strokeWidth={1.5} />
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center bg-gradient-to-br from-pastel-lavender/15 to-pink-50/80 overflow-hidden ${rounded} ${className}`}
    >
      <img
        src={url}
        alt={alt}
        loading="lazy"
        decoding="async"
        className={`max-w-full max-h-full w-full h-full ${fitClass}`}
        onError={() => setError(true)}
      />
    </div>
  );
}
