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
      console.log('Aplicando migración v3 (servicios)...');
      await client.query(readSql('migration_v3_services.sql'));
      console.log('✓ Migración v3 aplicada (helados + copias)');
      console.log('Aplicando migración v4 (fecha ventas Colombia)...');
      await client.query(readSql('migration_v4_sale_date_tz.sql'));
      console.log('✓ Migración v4 aplicada (sale_date en America/Bogota)');
      console.log('Aplicando migración v5 (códigos de barras)...');
      await client.query(readSql('migration_v5_barcode.sql'));
      console.log('✓ Migración v5 aplicada (barcode en productos)');
      console.log('Aplicando migración v6 (cola offline)...');
      await client.query(readSql('migration_v6_client_sale_id.sql'));
      console.log('✓ Migración v6 aplicada (client_sale_id en ventas)');
      console.log('Aplicando migración v7 (secuencia códigos de barras)...');
      await client.query(readSql('migration_v7_barcode_seq.sql'));
      console.log('✓ Migración v7 aplicada (barcode_seq)');
      console.log('Aplicando migración v8 (cierre de caja)...');
      await client.query(readSql('migration_v8_cash_close.sql'));
      console.log('✓ Migración v8 aplicada (cash_closes)');
      console.log('Aplicando migración v9 (cierre efectivo + Nequi)...');
      await client.query(readSql('migration_v9_cash_close_nequi.sql'));
      console.log('✓ Migración v9 aplicada (nequi en cash_closes)');
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
