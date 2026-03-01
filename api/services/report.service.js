const pool = require('../config/db');

function parseDateRange(query) {
  const start = query.start
    ? new Date(query.start + "T00:00:00.000Z")
    : new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const end = query.end
    ? new Date(query.end + "T23:59:59.999Z")
    : new Date();

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

exports.getSalesSummary = async (query) => {
  const { start, end } = parseDateRange(query);

  const { rows } = await pool.query(
    `
    SELECT
      COUNT(*) AS total_orders,
      COUNT(*) FILTER (WHERE status='PAID') AS paid_orders,
      COUNT(*) FILTER (WHERE status='USED') AS used_orders,

      COUNT(*) FILTER (
        WHERE status='USED' AND print_mode='BW'
      ) AS used_bw_jobs,

      COUNT(*) FILTER (
        WHERE status='USED' AND print_mode='COLOR'
      ) AS used_color_jobs,

      COALESCE(SUM(price) FILTER (WHERE status IN ('PAID','USED')), 0) AS total_revenue
    FROM jobs
    WHERE created_at BETWEEN $1 AND $2
    `,
    [start, end]
  );

  return rows[0];
};

exports.getOrders = async (query) => {
  const { start, end } = parseDateRange(query);

  const page = parseInt(query.page || 1);
  const limit = parseInt(query.limit || 10);
  const offset = (page - 1) * limit;

  const status = query.status || null;
  const code = query.code || null;

  const { rows } = await pool.query(
    `
    SELECT code, filename, copies, pages, print_mode, price, status, created_at
    FROM jobs
    WHERE created_at BETWEEN $1 AND $2
      AND ($3::text IS NULL OR status = $3)
      AND ($4::text IS NULL OR code ILIKE '%' || $4 || '%')
    ORDER BY created_at DESC
    LIMIT $5 OFFSET $6
    `,
    [start, end, status, code, limit, offset]
  );

  const countResult = await pool.query(
    `
    SELECT COUNT(*) FROM jobs
    WHERE created_at BETWEEN $1 AND $2
      AND ($3::text IS NULL OR status = $3)
      AND ($4::text IS NULL OR code ILIKE '%' || $4 || '%')
    `,
    [start, end, status, code]
  );

  return {
    data: rows,
    total: parseInt(countResult.rows[0].count),
    page,
  };
};

exports.exportOrders = async (query) => {
  const { start, end } = parseDateRange(query);
  const status = query.status || null;

  const { rows } = await pool.query(
    `
    SELECT
      id,
      code,
      filename,
      file_url,
      copies,
      pages,
      print_mode,
      price,
      status,
      payment_ref,
      created_at,
      paid_at,
      printed_at
    FROM jobs
    WHERE created_at BETWEEN $1 AND $2
      AND ($3::text IS NULL OR status = $3)
    ORDER BY created_at DESC
    `,
    [start, end, status]
  );

  // Proper CSV escaping
  const escapeCsv = (value) => {
    if (value === null || value === undefined) return "";
    const stringValue = String(value);

    if (
      stringValue.includes(",") ||
      stringValue.includes("\n") ||
      stringValue.includes('"')
    ) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }

    return stringValue;
  };

  const headers = [
    "ID",
    "Code",
    "Filename",
    "File URL",
    "Copies",
    "Pages",
    "Print Mode",
    "Price",
    "Status",
    "Payment Ref",
    "Created At",
    "Paid At",
    "Printed At"
  ];

  const csvRows = rows.map(row => [
    row.id,
    row.code,
    row.filename,
    row.file_url,
    row.copies,
    row.pages,
    row.print_mode,
    row.price,
    row.status,
    row.payment_ref,
    row.created_at,
    row.paid_at,
    row.printed_at
  ].map(escapeCsv));

  const csv = [
    headers.join(","),
    ...csvRows.map(r => r.join(","))
  ].join("\n");

  const filename = `orders_${start}_${end}${status ? "_" + status : ""}.csv`;

  return { csv, filename };
};

exports.reverseUsedToPaid = async (code) => {
  const { rowCount } = await pool.query(
    `
    UPDATE jobs
    SET status = 'PAID',
        printed_at = NULL
    WHERE code = $1
      AND status = 'USED'
    `,
    [code]
  );

  return rowCount;
};
