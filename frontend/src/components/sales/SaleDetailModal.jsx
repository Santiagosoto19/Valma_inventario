import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import Modal from '../ui/Modal';
import VirtualInvoice from './VirtualInvoice';

export default function SaleDetailModal({ saleId, onClose }) {
  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setSale(await api.sales.get(saleId));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    if (saleId) load();
  }, [saleId]);

  return (
    <Modal open onClose={onClose} size="md">
      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 rounded-full border-4 border-pink-200 border-t-pink-500 animate-spin" />
        </div>
      )}
      {error && <p className="text-rose-600 text-center py-8 font-medium">{error}</p>}
      {!loading && !error && sale && <VirtualInvoice sale={sale} onClose={onClose} />}
    </Modal>
  );
}
