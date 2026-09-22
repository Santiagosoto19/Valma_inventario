import { IceCreamCone } from 'lucide-react';
import QuickServiceSale from '../components/QuickServiceSale';

export default function HeladosPage() {
  return (
    <QuickServiceSale
      title="Helados"
      subtitle="Venta rápida — toca el precio para cambiarlo"
      serviceGroup="helados"
      accent="pink"
      icon={IceCreamCone}
    />
  );
}
