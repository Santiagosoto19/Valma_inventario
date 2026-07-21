import { Copy } from 'lucide-react';
import QuickServiceSale from '../components/QuickServiceSale';

export default function CopiasPage() {
  return (
    <QuickServiceSale
      title="Copias"
      subtitle="Color $500 — Blanco y negro $300"
      serviceGroup="copias"
      accent="sky"
      icon={Copy}
    />
  );
}
