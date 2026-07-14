import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendDir = path.resolve(__dirname, '..');
const rootDir = path.resolve(frontendDir, '..');

function normalizeEnvUrl(value) {
  return String(value ?? '')
    .replace(/\s/g, '')
    .replace(/\/api\/?$/i, '')
    .replace(/\/+$/, '');
}

const backendUrl = normalizeEnvUrl(process.env.VITE_API_URL || process.env.BACKEND_URL);

const apiRewrites = backendUrl
  ? [
      { source: '/api/:path*', destination: `${backendUrl}/api/:path*` },
      { source: '/uploads/:path*', destination: `${backendUrl}/uploads/:path*` },
    ]
  : [];

const frontendConfig = {
  $schema: 'https://openapi.vercel.sh/vercel.json',
  buildCommand: 'node scripts/prepare-vercel.js && vite build',
  outputDirectory: 'dist',
  installCommand: 'npm install',
  framework: 'vite',
  rewrites: [...apiRewrites, { source: '/(.*)', destination: '/index.html' }],
};

const rootConfig = {
  $schema: 'https://openapi.vercel.sh/vercel.json',
  buildCommand: 'node frontend/scripts/prepare-vercel.js && npm run build --prefix frontend',
  outputDirectory: 'frontend/dist',
  installCommand: 'npm install --prefix frontend',
  framework: 'vite',
  rewrites: [...apiRewrites, { source: '/(.*)', destination: '/index.html' }],
};

fs.writeFileSync(
  path.join(frontendDir, 'vercel.json'),
  JSON.stringify(frontendConfig, null, 2) + '\n'
);

fs.writeFileSync(
  path.join(rootDir, 'vercel.json'),
  JSON.stringify(rootConfig, null, 2) + '\n'
);

if (backendUrl) {
  console.log(`✓ API configurada → ${backendUrl}`);
  console.log('  El frontend llamará al backend directamente (VITE_API_URL) o vía proxy /api');
} else if (process.env.VERCEL) {
  console.error('\n✗ Error: falta VITE_API_URL o BACKEND_URL en Vercel');
  console.error('  Settings → Environment Variables → agrega la URL de tu backend (Railway/Render)');
  console.error('  Sin esto el login devuelve Error 405.\n');
  process.exit(1);
} else {
  console.warn('⚠ VITE_API_URL no definida — solo afecta builds de producción en Vercel');
}
