import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

function resolveSsl() {
  if (process.env.DATABASE_SSL === 'false') return false;
  if (process.env.DATABASE_SSL === 'true') {
    return { rejectUnauthorized: false };
  }

  const url = process.env.DATABASE_URL || '';
  if (
    url.includes('neon.tech') ||
    url.includes('sslmode=require') ||
    url.includes('sslmode=verify-full')
  ) {
    return { rejectUnauthorized: false };
  }

  return false;
}

function createPool() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('DATABASE_URL no está definida');
  }

  const isServerless = Boolean(process.env.VERCEL);

  const baseConfig = {
    connectionString,
    ssl: resolveSsl(),
    max: isServerless ? 1 : 10,
    idleTimeoutMillis: isServerless ? 5_000 : 30_000,
    connectionTimeoutMillis: 8_000,
    allowExitOnIdle: isServerless,
  };

  return new pg.Pool(baseConfig);
}

const pool = createPool();

pool.on('error', (err) => {
  console.error('Error inesperado en el pool de PostgreSQL:', err);
});

export default pool;

export async function queryWithTimeout(text, params = [], timeoutMs = 8_000) {
  let timer;
  try {
    return await Promise.race([
      pool.query(text, params),
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error('TIMEOUT_DB: la consulta tardó demasiado')),
          timeoutMs
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function connectWithTimeout(timeoutMs = 8_000) {
  let timer;
  try {
    return await Promise.race([
      pool.connect(),
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error('TIMEOUT_DB: no se pudo conectar a la base de datos')),
          timeoutMs
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function pingDatabase(timeoutMs = 5_000) {
  await queryWithTimeout('SELECT 1 AS ok', [], timeoutMs);
  return true;
}
