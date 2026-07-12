import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const { Client } = pg;

export function resolveSsl() {
  if (process.env.DATABASE_SSL === 'false') return false;
  const url = process.env.DATABASE_URL || '';
  if (
    process.env.DATABASE_SSL === 'true' ||
    url.includes('neon.tech') ||
    url.includes('sslmode=require')
  ) {
    return { rejectUnauthorized: false };
  }
  return false;
}

export function createClient() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL no está definida en backend/.env');
    process.exit(1);
  }
  return new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: resolveSsl(),
  });
}

export async function tableExists(client, tableName) {
  const { rows } = await client.query(
    `SELECT EXISTS (
       SELECT FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = $1
     ) AS exists`,
    [tableName]
  );
  return rows[0].exists;
}

export function readSql(filename) {
  return fs.readFileSync(
    path.resolve(__dirname, '../../database', filename),
    'utf8'
  );
}
