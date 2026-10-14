-- Per-page print prices, editable from the admin portal.
-- Seeded with the previously hardcoded values so deploying this is a no-op
-- until an admin changes them.
CREATE TABLE IF NOT EXISTS print_prices (
    print_mode VARCHAR(10) PRIMARY KEY
        CHECK (print_mode IN ('BW', 'COLOR')),

    price_per_page INTEGER NOT NULL CHECK (price_per_page > 0),

    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO print_prices (print_mode, price_per_page)
VALUES ('BW', 1000), ('COLOR', 2000)
ON CONFLICT (print_mode) DO NOTHING;
