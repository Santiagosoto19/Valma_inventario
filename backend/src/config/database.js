import pg from 'pg';
import { Pool as NeonPool } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

function normalizeNeonUrl(url) {
  if (!url?.includes('neon.tech') || url.includes('-pooler.')) return url;
  return url.replace(/(@ep-[^.-]+)(\.)/, '$1-pooler$2');
}

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
  const connectionString = normalizeNeonUrl(process.env.DATABASE_URL);

  if (!connectionString) {
    console.error('DATABASE_URL no está definida');
  }

  const isServerless = Boolean(process.env.VERCEL);

  if (isServerless && connectionString?.includes('neon.tech')) {
    return new NeonPool({ connectionString });
  }

  return new pg.Pool({
    connectionString,
    ssl: resolveSsl(),
    max: isServerless ? 1 : 10,
    idleTimeoutMillis: isServerless ? 5_000 : 30_000,
    connectionTimeoutMillis: 10_000,
    allowExitOnIdle: isServerless,
  });
}

const pool = createPool();

pool.on('error', (err) => {
  console.error('Error inesperado en el pool de PostgreSQL:', err);
});

function normalizeDbError(error) {
  const msg = error?.message || '';
  if (msg.includes('timeout exceeded when trying to connect')) {
    return new Error(
      'TIMEOUT_DB: no se pudo conectar a la base de datos. Usa la URL pooler de Neon (-pooler).'
    );
  }
  return error;
}

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
  } catch (error) {
    throw normalizeDbError(error);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function connectWithTimeout(timeoutMs = 10_000) {
  let timer;
  try {
    const client = await Promise.race([
      pool.connect(),
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error('TIMEOUT_DB: no se pudo conectar a la base de datos')),
          timeoutMs
        );
      }),
    ]);
    await client.query('SET statement_timeout = 8000');
    return client;
  } catch (error) {
    throw normalizeDbError(error);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function pingDatabase(timeoutMs = 5_000) {
  await queryWithTimeout('SELECT 1 AS ok', [], timeoutMs);
  return true;
}
