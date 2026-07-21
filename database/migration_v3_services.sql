-- Servicios: helados y copias (venta rápida sin control de stock)

ALTER TABLE products ADD COLUMN IF NOT EXISTS service_key VARCHAR(50) UNIQUE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS service_group VARCHAR(20);
ALTER TABLE products ADD COLUMN IF NOT EXISTS track_stock BOOLEAN DEFAULT true;

UPDATE products SET track_stock = true WHERE track_stock IS NULL;

INSERT INTO products (name, description, stock, price, service_key, service_group, track_stock)
VALUES
  ('Helado $2.500', 'Helado', 0, 2500, 'helado_2500', 'helados', false),
  ('Helado $5.000', 'Helado', 0, 5000, 'helado_5000', 'helados', false),
  ('Copia a color', 'Copia a color', 0, 500, 'copia_color', 'copias', false),
  ('Copia blanco y negro', 'Copia blanco y negro', 0, 300, 'copia_bn', 'copias', false)
ON CONFLICT (service_key) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  service_group = EXCLUDED.service_group,
  track_stock = EXCLUDED.track_stock;

CREATE INDEX IF NOT EXISTS idx_products_service_group ON products(service_group);
