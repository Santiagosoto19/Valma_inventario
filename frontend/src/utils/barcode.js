export function looksLikeBarcode(value) {
  const trimmed = normalizeScanPayload(value);
  if (/^\d{6,}$/.test(trimmed)) return true;
  return trimmed.length >= 8 && /\d/.test(trimmed) && /^[0-9A-Za-z-]+$/.test(trimmed);
}

/** Full code ready to submit without waiting for Enter (UPC/EAN-13, not prefixes). */
export function isCompleteBarcode(value) {
  const trimmed = normalizeScanPayload(value);
  if (/^\d{12,14}$/.test(trimmed)) return true;
  if (/^\d{6,11}$/.test(trimmed)) return false;
  return trimmed.length >= 8 && /\d/.test(trimmed) && /^[0-9A-Za-z-]{8,}$/.test(trimmed);
}

export function normalizeScanPayload(value) {
  return String(value || '')
    .replace(/[\r\n\t]/g, '')
    .replace(/^[^0-9A-Za-z]+|[^0-9A-Za-z]+$/g, '')
    .trim();
}

export function isScanTerminator(event) {
  const key = event.key;
  const code = event.code;
  if (key === 'Enter' || code === 'Enter' || code === 'NumpadEnter') return true;
  if (key === 'Tab') return true;
  if (event.ctrlKey && (key === 'j' || key === 'J' || key === 'm' || key === 'M')) return true;
  return false;
}

export function isIgnorableScanModifier(event) {
  const key = event.key;
  const code = event.code || '';
  return (
    key === 'Shift' ||
    key === 'Control' ||
    key === 'Alt' ||
    key === 'AltGraph' ||
    key === 'Meta' ||
    key === 'CapsLock' ||
    key === 'NumLock' ||
    key === 'ScrollLock' ||
    key === 'Process' ||
    key === 'Unidentified' ||
    key === 'Dead' ||
    code === 'NumLock' ||
    code === 'CapsLock'
  );
}

export function scanKeyToChar(event) {
  if (event.ctrlKey || event.altKey || event.metaKey) return '';

  const code = event.code || '';
  const digit = code.match(/^(?:Digit|Numpad)([0-9])$/);
  if (digit) return digit[1];

  if (event.repeat) return '';

  if (event.key && event.key.length === 1 && /[0-9A-Za-z-]/.test(event.key)) {
    return event.key;
  }
  return '';
}
