const { Pool } = require('pg')

function resolveConnectionConfig() {
  if (process.env.POSTGRES_URL?.trim()) {
    return {
      connectionString: process.env.POSTGRES_URL.trim(),
      ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    }
  }

  return {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: Number(process.env.POSTGRES_PORT || 5432),
    database: process.env.POSTGRES_DB || 'receipts_gen',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  }
}

const pool = new Pool(resolveConnectionConfig())

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS receipts (
      id BIGSERIAL PRIMARY KEY,
      receipt_number TEXT NOT NULL UNIQUE,
      receipt_date DATE NOT NULL,
      member_name TEXT NOT NULL,
      flat_shop_no TEXT NOT NULL,
      total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),
      maint_contribution NUMERIC(12, 2) NOT NULL DEFAULT 0,
      share_capital NUMERIC(12, 2) NOT NULL DEFAULT 0,
      entrance_fees NUMERIC(12, 2) NOT NULL DEFAULT 0,
      developments_fund NUMERIC(12, 2) NOT NULL DEFAULT 0,
      penalty_interest NUMERIC(12, 2) NOT NULL DEFAULT 0,
      mobile_no TEXT,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE receipts
    ADD COLUMN IF NOT EXISTS mobile_no TEXT;

    ALTER TABLE receipts
    ADD COLUMN IF NOT EXISTS maint_contribution NUMERIC(12, 2) NOT NULL DEFAULT 0;
    ALTER TABLE receipts
    ADD COLUMN IF NOT EXISTS share_capital NUMERIC(12, 2) NOT NULL DEFAULT 0;
    ALTER TABLE receipts
    ADD COLUMN IF NOT EXISTS entrance_fees NUMERIC(12, 2) NOT NULL DEFAULT 0;
    ALTER TABLE receipts
    ADD COLUMN IF NOT EXISTS developments_fund NUMERIC(12, 2) NOT NULL DEFAULT 0;
    ALTER TABLE receipts
    ADD COLUMN IF NOT EXISTS penalty_interest NUMERIC(12, 2) NOT NULL DEFAULT 0;

    CREATE INDEX IF NOT EXISTS idx_receipts_receipt_date ON receipts(receipt_date);

    CREATE TABLE IF NOT EXISTS delivery_logs (
      id BIGSERIAL PRIMARY KEY,
      receipt_id BIGINT REFERENCES receipts(id) ON DELETE SET NULL,
      receipt_number TEXT NOT NULL,
      mobile_no TEXT,
      channel TEXT NOT NULL DEFAULT 'whatsapp',
      status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'retry')),
      error_message TEXT,
      attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_delivery_logs_receipt_id ON delivery_logs(receipt_id);
    CREATE INDEX IF NOT EXISTS idx_delivery_logs_status ON delivery_logs(status);
  `)
}

async function closePool() {
  await pool.end()
}

module.exports = {
  pool,
  initDb,
  closePool,
}
