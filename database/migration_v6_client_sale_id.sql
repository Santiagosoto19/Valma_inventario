ALTER TABLE sales ADD COLUMN IF NOT EXISTS client_sale_id VARCHAR(64);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_client_sale_id
  ON sales (client_sale_id)
  WHERE client_sale_id IS NOT NULL;
