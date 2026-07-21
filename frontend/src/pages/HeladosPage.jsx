import { IceCreamCone } from 'lucide-react';
import QuickServiceSale from '../components/QuickServiceSale';

export default function HeladosPage() {
  return (
    <QuickServiceSale
      title="Helados"
      subtitle="Venta rápida — $2.500 y $5.000"
      serviceGroup="helados"
      accent="pink"
      icon={IceCreamCone}
    />
  );
}
