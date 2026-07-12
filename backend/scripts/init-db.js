import { createClient, tableExists, readSql } from './db-utils.js';

async function initDatabase() {
  const client = createClient();
  const seed = process.argv.includes('--seed');

  try {
    await client.connect();
    console.log('Conectado a PostgreSQL (Neon)');

    const exists = await tableExists(client, 'products');

    if (exists) {
      console.log('Las tablas ya existen. Si necesitas actualizar, usa: npm run db:migrate');
      process.exit(0);
    }

    await client.query(readSql('schema.sql'));
    console.log('✓ Schema creado correctamente');

    if (seed) {
      await client.query(readSql('seed.sql'));
      console.log('✓ Datos de ejemplo insertados');
    }

    console.log('Base de datos lista.');
  } catch (error) {
    console.error('Error al inicializar:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

initDatabase();
