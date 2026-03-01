"use client";

import { useEffect, useState } from "react";

type Order = {
  code: string;
  price: number;
  status: string;
  created_at: string;
  copies: number;
  pages: number;
  print_mode: string;
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [status, setStatus] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [loading, setLoading] = useState(false);

  const limit = 10;

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);

      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });

      if (status) params.append("status", status);
      if (startDate) params.append("start", startDate);
      if (endDate) params.append("end", endDate);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/orders?${params.toString()}`,
        { credentials: "include" }
      );

      const data = await res.json();
      setOrders(data.data);
      setTotal(data.total);
      setLoading(false);
    };

    fetchOrders();
  }, [page, status, startDate, endDate]);

  const totalPages = Math.ceil(total / limit);

  const getPageNumbers = () => {
    const range = 2;
    const start = Math.max(1, page - range);
    const end = Math.min(totalPages, page + range);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };

  const resetFilters = () => {
    setStatus("");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  const handleExport = () => {
    const params = new URLSearchParams();

    if (status) params.append("status", status);
    if (startDate) params.append("start", startDate);
    if (endDate) params.append("end", endDate);

    const url = `${process.env.NEXT_PUBLIC_API_URL}/admin/orders/export?${params.toString()}`;

    window.open(url, "_blank");
  };

  return (
    <div className="space-y-8">

      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold">Order List</h2>
        <p className="text-blue-300 text-sm mt-1">
          Filter and monitor print transactions
        </p>
      </div>

      {/* Filters */}
      <div className="bg-[#0b1b3a] border border-blue-400/20 rounded-2xl p-6 flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end">

        {/* Status */}
        <div className="flex flex-col text-sm w-full lg:w-auto">
          <label className="text-blue-300 mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="w-full bg-[#050b1f] border border-blue-400/30 rounded-lg px-3 py-2 text-white"
          >
            <option value="">All</option>
            <option value="PAID">PAID</option>
            <option value="USED">USED</option>
            <option value="PENDING">PENDING</option>
          </select>
        </div>

        {/* Start Date */}
        <div className="flex flex-col text-sm w-full lg:w-auto">
          <label className="text-blue-300 mb-1">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(1);
            }}
            className="w-full bg-[#050b1f] border border-blue-400/30 rounded-lg px-3 py-2 text-white"
          />
        </div>

        {/* End Date */}
        <div className="flex flex-col text-sm w-full lg:w-auto">
          <label className="text-blue-300 mb-1">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPage(1);
            }}
            className="w-full bg-[#050b1f] border border-blue-400/30 rounded-lg px-3 py-2 text-white"
          />
        </div>

        {/* Buttons Container */}
        <div className="flex flex-col gap-3 w-full lg:flex-row lg:w-auto">
          <button
            onClick={resetFilters}
            className="w-full lg:w-auto px-4 py-2 bg-blue-900/40 hover:bg-blue-800/60 rounded-lg transition text-sm"
          >
            Reset
          </button>

          <button
            onClick={handleExport}
            className="w-full lg:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg transition text-sm"
          >
            Export CSV
          </button>
        </div>

      </div>

      {/* Table */}
      <div className="bg-[#0b1b3a] border border-blue-400/20 rounded-2xl overflow-hidden">
        <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-blue-800">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-blue-900/20 text-blue-300">
              <tr>
                <th className="text-left p-4">Code</th>
                <th className="text-left p-4">Mode</th>
                <th className="text-left p-4">Copies</th>
                <th className="text-left p-4">Pages</th>
                <th className="text-left p-4">Price</th>
                <th className="text-left p-4">Status</th>
                <th className="text-left p-4">Date</th>
              </tr>
            </thead>
            <tbody className="relative">

              {loading && (
                <tr>
                  <td colSpan={7} className="p-0">
                    <div className="absolute inset-0 bg-[#0b1b3a]/70 backdrop-blur-sm flex items-center justify-center z-10">
                      <div className="flex items-center gap-3 text-blue-300 text-sm animate-pulse">
                        <div className="w-3 h-3 rounded-full bg-blue-400 animate-bounce" />
                        Loading orders...
                      </div>
                    </div>
                  </td>
                </tr>
              )}

              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-t border-blue-400/10 animate-pulse">
                      <td className="p-4"><div className="h-4 w-24 bg-blue-900/40 rounded" /></td>
                      <td className="p-4"><div className="h-4 w-16 bg-blue-900/40 rounded" /></td>
                      <td className="p-4"><div className="h-4 w-10 bg-blue-900/40 rounded" /></td>
                      <td className="p-4"><div className="h-4 w-10 bg-blue-900/40 rounded" /></td>
                      <td className="p-4"><div className="h-4 w-20 bg-blue-900/40 rounded" /></td>
                      <td className="p-4"><div className="h-6 w-16 bg-blue-900/40 rounded-full" /></td>
                      <td className="p-4"><div className="h-4 w-32 bg-blue-900/40 rounded" /></td>
                    </tr>
                  ))
                : orders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-blue-300">
                        No orders found.
                      </td>
                    </tr>
                  ) : (
                    orders.map((order) => (
                      <tr
                        key={order.code}
                        className="border-t border-blue-400/10 hover:bg-blue-900/20 transition"
                      >
                        <td className="p-4 font-mono tracking-wide text-blue-200">
                          {order.code}
                        </td>

                        <td className="p-4">
                          <PrintModeBadge mode={order.print_mode} />
                        </td>

                        <td className="p-4 text-blue-200">
                          {order.copies}
                        </td>

                        <td className="p-4 text-blue-200">
                          {order.pages}
                        </td>

                        <td className="p-4">
                          Rp {order.price.toLocaleString("id-ID")}
                        </td>

                        <td className="p-4">
                          <StatusBadge status={order.status} />
                        </td>

                        <td className="p-4 text-blue-200">
                          {new Date(order.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-between items-center text-sm">
          <span className="text-blue-300">
            Page {page} of {totalPages}
          </span>

          <div className="flex items-center gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-2 rounded-lg bg-blue-900/40 hover:bg-blue-800/60 disabled:opacity-40 transition"
            >
              Prev
            </button>

            {getPageNumbers().map((num) => (
              <button
                key={num}
                onClick={() => setPage(num)}
                className={`px-3 py-2 rounded-lg transition ${
                  page === num
                    ? "bg-blue-600 shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                    : "bg-blue-900/40 hover:bg-blue-800/60"
                }`}
              >
                {num}
              </button>
            ))}

            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 transition"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ========================= */
/* ===== Status Badge ====== */
/* ========================= */

function StatusBadge({ status }: { status: string }) {
  const base =
    "px-3 py-1 rounded-full text-xs font-semibold border inline-block";

  const styles: Record<string, string> = {
    PAID: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    USED: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    PENDING: "bg-orange-500/10 text-orange-400 border-orange-500/30",
  };

  return (
    <span
      className={`${base} ${
        styles[status] ||
        "bg-gray-500/10 text-gray-300 border-gray-500/30"
      }`}
    >
      {status}
    </span>
  );
}

function PrintModeBadge({ mode }: { mode: string }) {
  const base =
    "px-3 py-1 rounded-full text-xs font-semibold border inline-block";

  const styles: Record<string, string> = {
    BW: "bg-gray-500/10 text-gray-300 border-gray-500/30",
    COLOR: "bg-pink-500/10 text-pink-400 border-pink-500/30",
  };

  return (
    <span
      className={`${base} ${
        styles[mode] ||
        "bg-gray-500/10 text-gray-300 border-gray-500/30"
      }`}
    >
      {mode}
    </span>
  );
}
