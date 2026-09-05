import PDFDocument from 'pdfkit';
import bwipjs from 'bwip-js';

function bcidFor(code) {
  if (/^\d{13}$/.test(code)) return 'ean13';
  if (/^\d{12}$/.test(code)) return 'upca';
  if (/^\d{8}$/.test(code)) return 'ean8';
  return 'code128';
}

function formatCop(value) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(Number(value) || 0);
}

async function barcodePng(text) {
  return bwipjs.toBuffer({
    bcid: bcidFor(text),
    text: String(text),
    scale: 3,
    height: 14,
    includetext: true,
    textxalign: 'center',
  });
}

export async function streamBarcodesPdf(products, stream) {
  const labeled = products.filter((product) => product.barcode);
  const doc = new PDFDocument({ size: 'A4', margin: 36 });
  const finished = new Promise((resolve, reject) => {
    doc.on('end', resolve);
    stream.on('error', reject);
    doc.on('error', reject);
  });
  doc.pipe(stream);

  doc.fontSize(16).font('Helvetica-Bold').text('Valma Inventario — Códigos de barras', {
    align: 'center',
  });
  doc.moveDown(0.3);
  doc.fontSize(10).font('Helvetica').fillColor('#64748b')
    .text(`${labeled.length} productos · pega cada etiqueta y escanea en caja`, { align: 'center' });
  doc.fillColor('#0f172a');

  const cols = 2;
  const perPage = 10;
  const colW = (doc.page.width - 72) / cols;
  const rowH = 128;
  const startY = 88;

  for (let i = 0; i < labeled.length; i += 1) {
    if (i > 0 && i % perPage === 0) doc.addPage();
    const product = labeled[i];
    const col = i % cols;
    const row = Math.floor((i % perPage) / cols);
    const x = 36 + col * colW;
    const y = startY + row * rowH;

    doc.roundedRect(x, y, colW - 10, rowH - 10, 8).stroke('#e2e8f0');
    doc.fontSize(10).font('Helvetica-Bold').text(product.name || 'Producto', x + 8, y + 8, {
      width: colW - 26,
      ellipsis: true,
      lineBreak: false,
    });
    try {
      const png = await barcodePng(product.barcode);
      doc.image(png, x + 12, y + 28, { fit: [colW - 34, 58], align: 'center' });
    } catch {
      doc.fontSize(11).font('Courier').text(product.barcode, x + 8, y + 48, { width: colW - 26 });
    }
    doc.fontSize(11).font('Helvetica-Bold').text(formatCop(product.price), x + 8, y + 96, {
      width: colW - 26,
    });
  }

  if (!labeled.length) {
    doc.moveDown(2).fontSize(12).text('No hay productos con código de barras.', { align: 'center' });
  }

  doc.end();
  await finished;
}
