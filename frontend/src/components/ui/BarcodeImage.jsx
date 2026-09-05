import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

function barcodeFormat(value) {
  if (/^\d{13}$/.test(value)) return 'EAN13';
  if (/^\d{12}$/.test(value)) return 'UPC';
  if (/^\d{8}$/.test(value)) return 'EAN8';
  return 'CODE128';
}

export default function BarcodeImage({ value, height = 48, className = '' }) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!value || !svgRef.current) return;
    try {
      JsBarcode(svgRef.current, value, {
        format: barcodeFormat(value),
        width: 2,
        height,
        displayValue: true,
        fontSize: 14,
        margin: 4,
        background: 'transparent',
        lineColor: '#1e293b',
      });
    } catch {
      JsBarcode(svgRef.current, value, {
        format: 'CODE128',
        width: 2,
        height,
        displayValue: true,
        fontSize: 14,
        margin: 4,
        background: 'transparent',
        lineColor: '#1e293b',
      });
    }
  }, [height, value]);

  if (!value) return null;
  return <svg ref={svgRef} className={`w-full max-w-xs mx-auto ${className}`} />;
}

export function printProductBarcode(product) {
  if (!product?.barcode) return;
  const format = barcodeFormat(product.barcode);
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  try {
    JsBarcode(svg, product.barcode, {
      format,
      width: 2,
      height: 56,
      displayValue: true,
      fontSize: 16,
      margin: 8,
    });
  } catch {
    JsBarcode(svg, product.barcode, {
      format: 'CODE128',
      width: 2,
      height: 56,
      displayValue: true,
      fontSize: 16,
      margin: 8,
    });
  }

  const price = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(Number(product.price) || 0);

  const name = String(product.name || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');

  const win = window.open('', '_blank', 'width=420,height=360');
  if (!win) return;
  win.document.write(`<!DOCTYPE html>
<html>
head>
  <meta charset="utf-8" />
  <title>${name} — ${product.barcode}</title>
  <style>
    body { font-family: sans-serif; text-align: center; padding: 16px; color: #1e293b; }
    h1 { font-size: 16px; margin: 0 0 8px; }
    p { margin: 8px 0 0; font-weight: 700; }
    svg { max-width: 100%; }
  </style>
</head>
<body>
  <h1>${name}</h1>
  ${svg.outerHTML}
  <p>${price}</p>
  <script>window.onload = function () { window.print(); }<\/script>
</body>
</html>`);
  win.document.close();
}
