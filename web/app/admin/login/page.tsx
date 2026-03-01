"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // If already logged in, redirect to dashboard
  useEffect(() => {
    const checkAuth = async () => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/me`,
        { credentials: "include" }
      );

      if (res.ok) {
        router.replace("/admin");
      }
    };

    checkAuth();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            username,
            password,
          }),
        }
      );

      if (!res.ok) {
        throw new Error("Invalid credentials");
      }

      router.push("/admin");
    } catch (err) {
      setError("Invalid username or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050b1f] text-white px-4">

      <div className="w-full max-w-md bg-[#0b1b3a] border border-blue-400/20 rounded-2xl p-8 shadow-[0_0_30px_rgba(59,130,246,0.15)]">

        <h2 className="text-2xl font-semibold text-center">
          Admin Login
        </h2>

        <p className="text-blue-300 text-sm text-center mt-2">
          Sign in to access Anyprint dashboard
        </p>

        {error && (
          <div className="mt-6 bg-red-500/10 border border-red-500/40 text-red-400 text-sm rounded-xl p-3">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">

          <div>
            <label className="block text-sm text-blue-300 mb-1">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full bg-[#050b1f] border border-blue-400/30 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm text-blue-300 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-[#050b1f] border border-blue-400/30 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition rounded-lg py-2 font-medium"
          >
            {loading ? "Signing in..." : "Login"}
          </button>

        </form>
      </div>
    </div>
  );
}
