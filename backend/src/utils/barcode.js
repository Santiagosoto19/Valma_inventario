export function ean13CheckDigit(digits12) {
  const digits = String(digits12);
  let sum = 0;
  for (let i = 0; i < 12; i += 1) {
    sum += Number(digits[i]) * (i % 2 === 0 ? 1 : 3);
  }
  return String((10 - (sum % 10)) % 10);
}

export function internalEan13FromSeq(seq) {
  const body = `200${String(seq).padStart(9, '0')}`;
  return body + ean13CheckDigit(body);
}
