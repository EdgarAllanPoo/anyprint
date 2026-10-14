-- Base schema: one row per uploaded print job.
CREATE TABLE IF NOT EXISTS jobs (
    id SERIAL PRIMARY KEY,

    code VARCHAR(20) UNIQUE NOT NULL,

    filename TEXT NOT NULL,
    file_url TEXT NOT NULL,

    copies INTEGER NOT NULL CHECK (copies > 0),
    pages INTEGER NOT NULL CHECK (pages > 0),

    print_mode VARCHAR(10) NOT NULL
        CHECK (print_mode IN ('BW', 'COLOR')),

    price INTEGER NOT NULL CHECK (price >= 0),

    status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'PAID', 'USED')),

    payment_ref TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    paid_at TIMESTAMP,
    printed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_jobs_created_status_mode
ON jobs (created_at, status, print_mode);
