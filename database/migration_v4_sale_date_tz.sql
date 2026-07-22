-- Corrige sale_date usando la hora real de la venta (created_at) en zona Colombia.
-- Ventas hechas después de las 19:00 UTC-5 quedaban guardadas con el día siguiente.

UPDATE sales
SET sale_date = (created_at AT TIME ZONE 'America/Bogota')::date
WHERE sale_date IS DISTINCT FROM (created_at AT TIME ZONE 'America/Bogota')::date;
