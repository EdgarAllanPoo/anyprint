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

  const { rows } = await pool.query(
    `
    SELECT code, filename, copies, pages, price, status, created_at
    FROM jobs
    WHERE created_at BETWEEN $1 AND $2
      AND ($3::text IS NULL OR status = $3)
    ORDER BY created_at DESC
    LIMIT $4 OFFSET $5
    `,
    [start, end, status, limit, offset]
  );

  const countResult = await pool.query(
    `
    SELECT COUNT(*) FROM jobs
    WHERE created_at BETWEEN $1 AND $2
      AND ($3::text IS NULL OR status = $3)
    `,
    [start, end, status]
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
    SELECT code, filename, copies, pages, price, status, created_at
    FROM jobs
    WHERE created_at BETWEEN $1 AND $2
      AND ($3::text IS NULL OR status = $3)
    ORDER BY created_at DESC
    `,
    [start, end, status]
  );

  const headers = [
    "Code",
    "Filename",
    "Copies",
    "Pages",
    "Price",
    "Status",
    "Created At"
  ];

  const csvRows = rows.map(row => [
    row.code,
    row.filename,
    row.copies,
    row.pages,
    row.price,
    row.status,
    row.created_at
  ]);

  const csv = [
    headers.join(","),
    ...csvRows.map(r => r.join(","))
  ].join("\n");

  const filename = `orders_${start}_${end}${status ? "_" + status : ""}.csv`;

  return { csv, filename };
};
