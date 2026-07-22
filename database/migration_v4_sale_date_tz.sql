-- Sincroniza sale_date con la hora real de la venta en Colombia (America/Bogota).

UPDATE sales
SET sale_date = (created_at AT TIME ZONE 'America/Bogota')::date;
