CREATE TABLE IF NOT EXISTS cash_closes (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_date       DATE NOT NULL UNIQUE,
    opening_float       DECIMAL(12, 2) NOT NULL DEFAULT 0 CHECK (opening_float >= 0),
    cash_counted        DECIMAL(12, 2) CHECK (cash_counted IS NULL OR cash_counted >= 0),
    expected_cash       DECIMAL(12, 2),
    difference          DECIMAL(12, 2),
    cash_sales          DECIMAL(12, 2) NOT NULL DEFAULT 0,
    nequi_sales         DECIMAL(12, 2) NOT NULL DEFAULT 0,
    cash_transactions   INTEGER NOT NULL DEFAULT 0,
    nequi_transactions  INTEGER NOT NULL DEFAULT 0,
    total_sales         DECIMAL(12, 2) NOT NULL DEFAULT 0,
    total_transactions  INTEGER NOT NULL DEFAULT 0,
    notes               TEXT NOT NULL DEFAULT '',
    locked              BOOLEAN NOT NULL DEFAULT false,
    opened_at           TIMESTAMPTZ,
    closed_at           TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cash_closes_business_date ON cash_closes(business_date DESC);
