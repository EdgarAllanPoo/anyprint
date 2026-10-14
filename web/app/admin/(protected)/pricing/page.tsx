"use client";

import { useEffect, useState } from "react";

type PrintMode = "BW" | "COLOR";

const MODES: { key: PrintMode; label: string }[] = [
  { key: "BW", label: "Black & White" },
  { key: "COLOR", label: "Color" },
];

export default function PricingPage() {
  const [current, setCurrent] = useState<Record<PrintMode, number> | null>(null);
  const [form, setForm] = useState<Record<PrintMode, string>>({ BW: "", COLOR: "" });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchPrices();
  }, []);

  const applyPrices = (data: Record<PrintMode, number>) => {
    setCurrent(data);
    setForm({ BW: String(data.BW ?? ""), COLOR: String(data.COLOR ?? "") });
  };

  const fetchPrices = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/prices`,
        { credentials: "include" }
      );

      if (!res.ok) throw new Error("Failed");

      applyPrices(await res.json());
    } catch {
      setError("Failed to load prices.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setError(null);
    setSuccess(false);

    const body: Partial<Record<PrintMode, number>> = {};
    for (const { key, label } of MODES) {
      const value = Number(form[key]);
      if (!Number.isInteger(value) || value < 1) {
        setError(`${label} price must be a whole number greater than 0.`);
        return;
      }
      body[key] = value;
    }

    const confirmAction = confirm(
      `Update prices to B/W ${formatCurrency(body.BW!)} and Color ${formatCurrency(body.COLOR!)} per page? New orders will use these prices immediately.`
    );

    if (!confirmAction) return;

    setSaving(true);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/prices`,
        {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to update prices.");
        return;
      }

      applyPrices(data);
      setSuccess(true);
    } catch {
      setError("Failed to update prices.");
    } finally {
      setSaving(false);
    }
  };

  const isDirty =
    current !== null &&
    MODES.some(({ key }) => form[key] !== String(current[key] ?? ""));

  return (
    <div className="space-y-8">

      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold">Pricing</h2>
        <p className="text-blue-300 text-sm mt-1">
          Set the price per page for each print mode
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/40 text-red-400 text-sm rounded-xl p-4">
          {error}
        </div>
      )}

      {/* Success */}
      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 text-sm rounded-xl p-4">
          Prices updated. New orders will use the new prices.
        </div>
      )}

      <div className="bg-[#0b1b3a] border border-blue-400/20 rounded-2xl p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {MODES.map(({ key, label }) => (
            <div key={key} className="flex flex-col text-sm">
              <label className="text-blue-300 mb-1">{label} (Rp / page)</label>
              <input
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                value={form[key]}
                disabled={loading || saving}
                onChange={(e) => {
                  setSuccess(false);
                  setForm((f) => ({ ...f, [key]: e.target.value }));
                }}
                className="bg-[#050b1f] border border-blue-400/30 rounded-lg px-3 py-2 text-white disabled:opacity-50"
              />
              {current && (
                <span className="text-xs text-blue-400 mt-1">
                  Current: {formatCurrency(current[key])}
                </span>
              )}
            </div>
          ))}
        </div>

        <p className="text-xs text-blue-300">
          Orders that were already created keep the price they were quoted.
        </p>

        <button
          onClick={handleSave}
          disabled={loading || saving || !isDirty}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition text-sm font-medium disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Prices"}
        </button>
      </div>
    </div>
  );
}

function formatCurrency(value: number) {
  return `Rp ${value.toLocaleString("id-ID")}`;
}
