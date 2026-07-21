-- Valma Inventario - Schema PostgreSQL (compatible con Neon)
-- Opción A (recomendada): cd backend && npm run db:init
-- Opción B (psql): psql "postgresql://...@ep-xxx.neon.tech/neondb?sslmode=require" -f database/schema.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Configuración del sistema (umbral de stock crítico, etc.)
CREATE TABLE IF NOT EXISTS settings (
    key         VARCHAR(100) PRIMARY KEY,
    value       TEXT NOT NULL,
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO settings (key, value) VALUES ('stock_threshold', '5')
ON CONFLICT (key) DO NOTHING;

-- Productos
CREATE TABLE IF NOT EXISTS products (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(200) NOT NULL,
    description     TEXT NOT NULL DEFAULT '',
    image_url       TEXT,
    stock           INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    price           DECIMAL(12, 2) NOT NULL CHECK (price >= 0),
    service_key     VARCHAR(50) UNIQUE,
    service_group   VARCHAR(20),
    track_stock     BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_service_group ON products(service_group);

INSERT INTO products (name, description, stock, price, service_key, service_group, track_stock)
VALUES
  ('Helado $2.500', 'Helado', 0, 2500, 'helado_2500', 'helados', false),
  ('Helado $5.000', 'Helado', 0, 5000, 'helado_5000', 'helados', false),
  ('Copia a color', 'Copia a color', 0, 500, 'copia_color', 'copias', false),
  ('Copia blanco y negro', 'Copia blanco y negro', 0, 300, 'copia_bn', 'copias', false)
ON CONFLICT (service_key) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);

-- Ventas / Facturas
DO $$ BEGIN
    CREATE TYPE payment_method AS ENUM ('cash', 'nequi');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS sales (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number  VARCHAR(20) NOT NULL UNIQUE,
    subtotal        DECIMAL(12, 2) NOT NULL DEFAULT 0,
    discount_items  DECIMAL(12, 2) NOT NULL DEFAULT 0,
    discount_global DECIMAL(12, 2) NOT NULL DEFAULT 0,
    total           DECIMAL(12, 2) NOT NULL CHECK (total >= 0),
    payment_method  payment_method NOT NULL,
    sale_date       DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_sale_date ON sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_payment_method ON sales(payment_method);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);

-- Detalle de ventas
CREATE TABLE IF NOT EXISTS sale_items (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id          UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id       UUID NOT NULL REFERENCES products(id),
    product_name     VARCHAR(200) NOT NULL,
    quantity         INTEGER NOT NULL CHECK (quantity > 0),
    unit_price       DECIMAL(12, 2) NOT NULL CHECK (unit_price >= 0),
    line_subtotal    DECIMAL(12, 2) NOT NULL CHECK (line_subtotal >= 0),
    discount_amount  DECIMAL(12, 2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
    subtotal         DECIMAL(12, 2) NOT NULL CHECK (subtotal >= 0)
);

CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON sale_items(product_id);

-- Secuencia para números de factura
CREATE SEQUENCE IF NOT EXISTS invoice_seq START 1000;

-- Vista: productos con stock crítico
CREATE OR REPLACE VIEW low_stock_products AS
SELECT p.*,
       (SELECT value::INTEGER FROM settings WHERE key = 'stock_threshold') AS threshold
FROM products p
WHERE p.stock <= (SELECT value::INTEGER FROM settings WHERE key = 'stock_threshold');

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS products_updated_at ON products;
CREATE TRIGGER products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
