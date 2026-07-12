import { createClient, tableExists, readSql } from './db-utils.js';

async function migrate() {
  const client = createClient();

  try {
    await client.connect();
    console.log('Conectado a PostgreSQL (Neon)');

    const hasProducts = await tableExists(client, 'products');

    if (!hasProducts) {
      console.log('BD vacía detectada → creando schema completo...');
      await client.query(readSql('schema.sql'));
      console.log('✓ Schema creado (settings, brands, products, sales, sale_items)');
      console.log('');
      console.log('Opcional: npm run db:seed  — para datos de ejemplo');
    } else {
      console.log('BD existente → aplicando migración v2...');
      await client.query(readSql('migration_v2.sql'));
      console.log('✓ Migración v2 aplicada (descuentos + marcas)');
    }

    console.log('Base de datos lista.');

    if (process.argv.includes('--seed')) {
      await client.query(readSql('seed.sql'));
      console.log('✓ Datos de ejemplo insertados');
    }
  } catch (error) {
    console.error('Error:', error.message);
    if (error.message.includes('does not exist')) {
      console.error('');
      console.error('Sugerencia: ejecuta primero  npm run db:init');
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
