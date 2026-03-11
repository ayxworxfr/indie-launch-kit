CREATE TABLE IF NOT EXISTS orders (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  trade_no    TEXT UNIQUE NOT NULL,
  device_id   TEXT NOT NULL,
  email       TEXT NOT NULL,
  plan        TEXT NOT NULL,
  license_key TEXT,
  amount      TEXT,
  status      TEXT DEFAULT 'pending',
  created_at  TEXT NOT NULL
);
