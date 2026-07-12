-- Migración: Descuentos en ventas + Marcas
-- Ejecutar en Neon si ya tienes la BD creada: npm run db:migrate

-- Tabla de marcas
CREATE TABLE IF NOT EXISTS brands (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(200) NOT NULL UNIQUE,
    description TEXT NOT NULL DEFAULT '',
    image_url   TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Marca en productos
ALTER TABLE products ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_products_brand_id ON products(brand_id);

-- Descuentos en ventas
ALTER TABLE sales ADD COLUMN IF NOT EXISTS subtotal DECIMAL(12, 2);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS discount_items DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS discount_global DECIMAL(12, 2) DEFAULT 0;

UPDATE sales SET subtotal = total WHERE subtotal IS NULL;
UPDATE sales SET discount_items = 0 WHERE discount_items IS NULL;
UPDATE sales SET discount_global = 0 WHERE discount_global IS NULL;

ALTER TABLE sales ALTER COLUMN subtotal SET DEFAULT 0;
ALTER TABLE sales ALTER COLUMN discount_items SET DEFAULT 0;
ALTER TABLE sales ALTER COLUMN discount_global SET DEFAULT 0;

-- Descuentos por ítem
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS line_subtotal DECIMAL(12, 2);

UPDATE sale_items SET discount_amount = 0 WHERE discount_amount IS NULL;
UPDATE sale_items SET line_subtotal = subtotal WHERE line_subtotal IS NULL;

DROP TRIGGER IF EXISTS brands_updated_at ON brands;
CREATE TRIGGER brands_updated_at
    BEFORE UPDATE ON brands
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
