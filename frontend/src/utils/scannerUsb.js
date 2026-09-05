const PAIRED_KEY = 'valma_paired_scanner';

export const SCANNER_USB_FILTERS = [
  { vendorId: 0x0483, productId: 0x0011 },
  { vendorId: 0x0483 },
  { vendorId: 0x05e0 },
  { vendorId: 0x0c2e },
  { vendorId: 0x05f9 },
  { vendorId: 0x0536 },
  { vendorId: 0x1504 },
  { vendorId: 0x1eab },
  { vendorId: 0x0acd },
];

const NAME_RE = /barcode|scanner|honeywell|symbol|datalogic|zebra|newland|cipherlab|usb adapter|hidbar|lector/i;

export function browserUsbSupported() {
  return typeof navigator !== 'undefined' && Boolean(navigator.usb);
}

export function getPairedScanner() {
  try {
    const raw = localStorage.getItem(PAIRED_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function savePairedScanner(device) {
  const payload = {
    vendorId: device.vendorId,
    productId: device.productId,
    productName: device.productName || 'Lector USB',
    manufacturerName: device.manufacturerName || '',
  };
  localStorage.setItem(PAIRED_KEY, JSON.stringify(payload));
  return payload;
}

export function deviceLabel(device) {
  return [device.manufacturerName, device.productName || device.name]
    .filter(Boolean)
    .join(' ')
    .trim() || `USB ${device.vendorId?.toString(16)}:${device.productId?.toString(16)}`;
}

export function isPairedDevice(device, paired = getPairedScanner()) {
  if (!device || !paired) return false;
  return Number(device.vendorId) === Number(paired.vendorId)
    && Number(device.productId) === Number(paired.productId);
}

export function looksLikeBrowserScanner(device, paired = getPairedScanner()) {
  if (!device) return false;
  if (isPairedDevice(device, paired)) return true;
  const blob = `${device.productName || ''} ${device.manufacturerName || ''} ${device.name || ''}`;
  if (NAME_RE.test(blob)) return true;
  return SCANNER_USB_FILTERS.some((filter) => (
    Number(filter.vendorId) === Number(device.vendorId)
    && (filter.productId == null || Number(filter.productId) === Number(device.productId))
  ));
}

export async function listPermittedScanners() {
  if (!browserUsbSupported()) return [];
  const paired = getPairedScanner();
  const devices = await navigator.usb.getDevices();
  return devices.filter((device) => looksLikeBrowserScanner(device, paired));
}

export async function requestScannerDevice() {
  if (!browserUsbSupported()) {
    throw new Error('Este navegador no permite detectar USB. Usa Chrome o Edge.');
  }
  const device = await navigator.usb.requestDevice({ filters: SCANNER_USB_FILTERS });
  savePairedScanner(device);
  return device;
}
