ALTER TABLE cash_closes
    ADD COLUMN IF NOT EXISTS nequi_counted DECIMAL(12, 2) CHECK (nequi_counted IS NULL OR nequi_counted >= 0);

ALTER TABLE cash_closes
    ADD COLUMN IF NOT EXISTS expected_nequi DECIMAL(12, 2);

ALTER TABLE cash_closes
    ADD COLUMN IF NOT EXISTS cash_difference DECIMAL(12, 2);

ALTER TABLE cash_closes
    ADD COLUMN IF NOT EXISTS nequi_difference DECIMAL(12, 2);

UPDATE cash_closes
SET expected_nequi = COALESCE(expected_nequi, nequi_sales),
    cash_difference = COALESCE(cash_difference, difference),
    nequi_difference = COALESCE(nequi_difference, 0)
WHERE closed_at IS NOT NULL;
