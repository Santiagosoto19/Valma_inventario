import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const { generateMissingBarcodes, getAllProducts } = await import('../src/services/productService.js');
const { streamBarcodesPdf } = await import('../src/utils/barcodePdf.js');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const output = process.argv[2]
  || path.resolve(__dirname, '../../valma-codigos-barras.pdf');

console.log('Asignando códigos faltantes en Neon...');
const generated = await generateMissingBarcodes();
console.log(`Códigos nuevos: ${generated.length}`);

const products = await getAllProducts();
const withCodes = products.filter((product) => product.barcode);
console.log(`Productos con código: ${withCodes.length}. Creando PDF...`);

fs.mkdirSync(path.dirname(output), { recursive: true });
const dest = fs.createWriteStream(output);
const flushed = new Promise((resolve, reject) => {
  dest.on('finish', resolve);
  dest.on('error', reject);
});
await streamBarcodesPdf(products, dest);
await flushed;

console.log(`PDF: ${output}`);
process.exit(0);
