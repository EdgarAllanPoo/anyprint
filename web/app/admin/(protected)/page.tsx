"use client";

import { useEffect, useState } from "react";

type Summary = {
  total_orders: number;
  paid_orders: number;
  used_orders: number;
  used_bw_jobs: number;
  used_color_jobs: number;
  total_revenue: number;
};

export default function AdminDashboard() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState(false);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSummary();
  }, [startDate, endDate]);

  const fetchSummary = async () => {
    setLoading(true);
    setError(false);

    const params = new URLSearchParams();
    if (startDate) params.append("start", startDate);
    if (endDate) params.append("end", endDate);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/reports/sales?${params.toString()}`,
        { credentials: "include" }
      );

      if (!res.ok) throw new Error("Failed");

      const data = await res.json();
      setSummary(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setStartDate("");
    setEndDate("");
  };

  return (
    <div className="space-y-8">

      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold">Dashboard Overview</h2>
        <p className="text-blue-300 text-sm mt-1">
          Monitor business performance
        </p>
      </div>

      {/* Filters */}
      <div className="bg-[#0b1b3a] border border-blue-400/20 rounded-2xl p-6 flex flex-col sm:flex-row sm:flex-wrap gap-4 sm:items-end">

        <div className="flex flex-col text-sm">
          <label className="text-blue-300 mb-1">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-[#050b1f] border border-blue-400/30 rounded-lg px-3 py-2 text-white"
          />
        </div>

        <div className="flex flex-col text-sm">
          <label className="text-blue-300 mb-1">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-[#050b1f] border border-blue-400/30 rounded-lg px-3 py-2 text-white"
          />
        </div>

        <button
          onClick={resetFilters}
          className="px-4 py-2 bg-blue-900/40 hover:bg-blue-800/60 rounded-lg transition text-sm"
        >
          Reset
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/40 text-red-400 text-sm rounded-xl p-4">
          Failed to load dashboard data.
        </div>
      )}

      {/* Loading Skeleton */}
      {loading || !summary ? (
        <LoadingGrid />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatCard
            title="Total Orders"
            value={summary.total_orders}
          />
          <StatCard
            title="Paid Orders"
            value={summary.paid_orders}
          />
          <StatCard
            title="Printed Orders"
            value={summary.used_orders}
          />
          <StatCard
            title="Printed BW Orders"
            value={summary.used_bw_jobs}
          />
          <StatCard
            title="Printed Color Orders"
            value={summary.used_color_jobs}
          />          
          <StatCard
            title="Total Revenue"
            value={formatCurrency(summary.total_revenue)}
            highlight
          />
        </div>
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  highlight = false,
}: {
  title: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div className="bg-[#0b1b3a] border border-blue-400/30 rounded-2xl p-6 shadow-[0_0_20px_rgba(59,130,246,0.08)] hover:shadow-[0_0_30px_rgba(59,130,246,0.2)] transition">
      <p className="text-blue-300 text-sm">{title}</p>
      <p
        className={`mt-4 text-3xl font-bold ${
          highlight ? "text-emerald-400" : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="bg-[#0b1b3a] border border-blue-400/20 rounded-2xl p-6 animate-pulse"
        >
          <div className="h-4 bg-blue-900/40 rounded w-1/2" />
          <div className="mt-4 h-8 bg-blue-900/40 rounded w-3/4" />
        </div>
      ))}
    </div>
  );
}

function formatCurrency(value: number) {
  return `Rp ${value.toLocaleString("id-ID")}`;
}
