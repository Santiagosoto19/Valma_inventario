import { useState, useEffect } from 'react';
import { Upload, Link2 } from 'lucide-react';
import { api } from '../services/api';
import Modal from './ui/Modal';
import Button from './ui/Button';
import ImagePreview, { useImagePreview } from './ui/ImagePreview';

function isExternalUrl(url) {
  return url?.startsWith('http') || url?.includes('cloudinary.com');
}

export default function ProductForm({ product, onClose, onSuccess }) {
  const [form, setForm] = useState({
    name: product?.name || '',
    description: product?.description || '',
    stock: product?.stock ?? 0,
    price: product?.price ?? '',
    image_url: product?.image_url || '',
  });
  const [imageFile, setImageFile] = useState(null);
  const [useUrl, setUseUrl] = useState(
    !!product?.image_url && isExternalUrl(product.image_url)
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const preview = useImagePreview({
    file: imageFile,
    url: useUrl ? form.image_url : null,
    existingUrl: !imageFile && !useUrl ? product?.image_url : null,
  });

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', form.name);
      formData.append('description', form.description);
      formData.append('stock', form.stock);
      formData.append('price', form.price);
      if (imageFile) formData.append('image', imageFile);
      else if (useUrl && form.image_url) formData.append('image_url', form.image_url);

      if (product) await api.products.update(product.id, formData);
      else await api.products.create(formData);
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={product ? 'Editar producto' : 'Nuevo producto'} size="md">
      <form onSubmit={handleSubmit} className="space-y-4 -mt-2">
        <ImagePreview src={preview} alt="Preview producto" className="w-full h-44" />

        <div>
          <label className="label-pastel">Nombre *</label>
          <input className="input-pastel" name="name" value={form.name} onChange={handleChange} required />
        </div>
        <div>
          <label className="label-pastel">Descripción</label>
          <textarea className="input-pastel min-h-[70px]" name="description" value={form.description} onChange={handleChange} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-pastel">Stock</label>
            <input className="input-pastel" type="number" name="stock" min="0" value={form.stock} onChange={handleChange} />
          </div>
          <div>
            <label className="label-pastel">Precio *</label>
            <input className="input-pastel" type="number" name="price" min="0" step="0.01" value={form.price} onChange={handleChange} required />
          </div>
        </div>
        <div>
          <label className="label-pastel">Imagen (se guarda en Cloudinary)</label>
          <div className="flex gap-3 mb-3">
            <button type="button" onClick={() => setUseUrl(false)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold ${!useUrl ? 'bg-pink-100 text-pink-700' : 'bg-slate-100 text-slate-600'}`}>
              <Upload size={16} /> Subir archivo
            </button>
            <button type="button" onClick={() => setUseUrl(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold ${useUrl ? 'bg-pink-100 text-pink-700' : 'bg-slate-100 text-slate-600'}`}>
              <Link2 size={16} /> URL externa
            </button>
          </div>
          {useUrl ? (
            <input className="input-pastel" name="image_url" placeholder="https://..." value={form.image_url} onChange={handleChange} />
          ) : (
            <input className="input-pastel" type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} />
          )}
        </div>
        {error && <div className="p-3 rounded-2xl bg-rose-50 text-rose-700 text-sm font-medium">{error}</div>}
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button type="submit" className="flex-1" disabled={loading}>
            {loading ? 'Guardando...' : product ? 'Actualizar' : 'Crear'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
