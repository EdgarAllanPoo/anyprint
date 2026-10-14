const pool = require('../config/db');

const PRINT_MODES = ['BW', 'COLOR'];

// Upper bound per page so a typo in the admin portal can't produce absurd totals.
const MAX_PRICE_PER_PAGE = 1000000;

exports.PRINT_MODES = PRINT_MODES;

// Returns { BW: number, COLOR: number }.
exports.getPrices = async () => {
  const { rows } = await pool.query(
    'SELECT print_mode, price_per_page FROM print_prices'
  );

  const prices = {};
  for (const row of rows) {
    prices[row.print_mode] = Number(row.price_per_page);
  }

  return prices;
};

exports.getPricePerPage = async (printMode) => {
  const { rows } = await pool.query(
    'SELECT price_per_page FROM print_prices WHERE print_mode=$1',
    [printMode]
  );

  return rows.length ? Number(rows[0].price_per_page) : null;
};

// Accepts a partial map, e.g. { BW: 1500 } or { BW: 1500, COLOR: 3000 }.
exports.updatePrices = async (input) => {
  const entries = Object.entries(input || {});

  if (!entries.length) {
    throw { status: 400, message: "No prices provided" };
  }

  for (const [mode, value] of entries) {
    if (!PRINT_MODES.includes(mode)) {
      throw { status: 400, message: `Invalid print mode: ${mode}` };
    }

    if (!Number.isInteger(value) || value < 1 || value > MAX_PRICE_PER_PAGE) {
      throw {
        status: 400,
        message: `${mode} price must be a whole number between 1 and ${MAX_PRICE_PER_PAGE}`
      };
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const [mode, value] of entries) {
      await client.query(
        `INSERT INTO print_prices (print_mode, price_per_page, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (print_mode)
         DO UPDATE SET price_per_page=EXCLUDED.price_per_page, updated_at=NOW()`,
        [mode, value]
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return exports.getPrices();
};
