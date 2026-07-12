import Modal from '../ui/Modal';
import VirtualInvoice from './VirtualInvoice';

export default function InvoiceModal({ sale, onClose }) {
  if (!sale) return null;
  return (
    <Modal open onClose={onClose} size="md">
      <VirtualInvoice sale={sale} onClose={onClose} />
    </Modal>
  );
}
