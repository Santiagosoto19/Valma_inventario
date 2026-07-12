-- ============================================================
-- VALMA INVENTARIO — Script completo para Neon PostgreSQL
-- ============================================================
-- Cómo usarlo:
--   1. Entra a https://console.neon.tech
--   2. Abre tu proyecto → SQL Editor
--   3. Pega y ejecuta TODO este archivo
--   4. (Opcional) Ejecuta también seed.sql para datos de ejemplo
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Configuración del sistema ──────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
    key         VARCHAR(100) PRIMARY KEY,
    value       TEXT NOT NULL,
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO settings (key, value) VALUES ('stock_threshold', '5')
ON CONFLICT (key) DO NOTHING;

-- ── Marcas ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS brands (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(200) NOT NULL UNIQUE,
    description TEXT NOT NULL DEFAULT '',
    image_url   TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Productos ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(200) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    image_url   TEXT,
    brand_id    UUID REFERENCES brands(id) ON DELETE SET NULL,
    stock       INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    price       DECIMAL(12, 2) NOT NULL CHECK (price >= 0),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_brand_id ON products(brand_id);

-- ── Ventas / Facturas ──────────────────────────────────────
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

-- ── Detalle de ventas ──────────────────────────────────────
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

-- ── Secuencia de facturas ──────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS invoice_seq START 1000;

-- ── Vista: stock crítico ───────────────────────────────────
CREATE OR REPLACE VIEW low_stock_products AS
SELECT p.*,
       (SELECT value::INTEGER FROM settings WHERE key = 'stock_threshold') AS threshold
FROM products p
WHERE p.stock <= (SELECT value::INTEGER FROM settings WHERE key = 'stock_threshold');

-- ── Trigger updated_at ───────────────────────────────────────
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

DROP TRIGGER IF EXISTS brands_updated_at ON brands;
CREATE TRIGGER brands_updated_at
    BEFORE UPDATE ON brands
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- DATOS DE EJEMPLO (opcional — descomenta si los necesitas)
-- ============================================================

INSERT INTO brands (name, description) VALUES
('Diana', 'Alimentos básicos'),
('Bimbo', 'Panadería'),
('Oreo', 'Galletas')
ON CONFLICT (name) DO NOTHING;

INSERT INTO products (name, description, image_url, stock, price) VALUES
('Café Premium 500g', 'Café colombiano tostado medio', 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400', 25, 35000),
('Arroz Diana 1kg', 'Arroz blanco de grano largo', 'https://images.unsplash.com/photo-1586201375767-2b646c282fad?w=400', 3, 4500),
('Aceite Gourmet 1L', 'Aceite de girasol refinado', 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400', 8, 12000),
('Galletas Oreo', 'Galletas con crema de vainilla', 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400', 2, 8500),
('Leche Alquería 1L', 'Leche entera pasteurizada', 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400', 15, 5200),
('Pan Tajado Bimbo', 'Pan de caja blanco 680g', 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400', 4, 9800);

-- ============================================================
-- FIN — Tablas creadas:
--   settings, brands, products, sales, sale_items
-- ============================================================
