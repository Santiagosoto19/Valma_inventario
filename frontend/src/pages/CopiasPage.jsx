import { Copy } from 'lucide-react';
import QuickServiceSale from '../components/QuickServiceSale';

export default function CopiasPage() {
  return (
    <QuickServiceSale
      title="Copias"
      subtitle="Venta rápida — toca el precio para cambiarlo"
      serviceGroup="copias"
      accent="sky"
      icon={Copy}
    />
  );
}
