import { useEffect, useState } from 'react';
import { ImageOff } from 'lucide-react';
import { getImageUrl } from '../../services/api';

export function useImagePreview({ file, url, existingUrl }) {
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }
    if (url?.trim()) {
      setPreview(url.trim());
      return;
    }
    if (existingUrl) {
      setPreview(getImageUrl(existingUrl));
      return;
    }
    setPreview(null);
  }, [file, url, existingUrl]);

  return preview;
}

export default function ImagePreview({ src, alt = 'Vista previa', className = '' }) {
  const [error, setError] = useState(false);

  if (!src || error) {
    return (
      <div className={`flex flex-col items-center justify-center bg-gradient-to-br from-pastel-lavender/20 to-pink-50 rounded-2xl border-2 border-dashed border-pastel-lavender/50 ${className}`}>
        <ImageOff size={32} className="text-pastel-lavender-deep mb-2" strokeWidth={1.5} />
        <span className="text-xs text-slate-400 font-medium">Sin imagen</span>
      </div>
    );
  }

  return (
    <div className={`overflow-hidden rounded-2xl border-2 border-pastel-lavender/30 shadow-soft ${className}`}>
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover"
        onError={() => setError(true)}
      />
    </div>
  );
}
