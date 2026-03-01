"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/admin/logout`,
      {
        method: "POST",
        credentials: "include",
      }
    );

    router.push("/admin/login");
  };

  return (
    <div className="min-h-screen bg-[#050b1f] text-white flex">

      {/* ===== Mobile Overlay ===== */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ===== Sidebar ===== */}
      <aside
        className={`
          fixed top-0 left-0 h-screen w-64 bg-[#0b1b3a] border-r border-blue-400/20
          transform transition-transform duration-300 z-50
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          
          lg:static lg:translate-x-0 lg:h-auto lg:flex
          flex flex-col
        `}
      >
        {/* Logo */}
        <div className="p-6 border-b border-blue-400/20 flex justify-center">
          <div className="relative w-[140px] h-[40px]">
            <Image
              src="/logo.png"
              alt="Anyprint Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          <NavItem
            href="/admin"
            label="Dashboard"
            active={pathname === "/admin"}
            onClick={() => setSidebarOpen(false)}
          />
          <NavItem
            href="/admin/orders"
            label="Order List"
            active={pathname.startsWith("/admin/orders")}
            onClick={() => setSidebarOpen(false)}
          />
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-blue-400/20">
          <button
            onClick={handleLogout}
            className="w-full px-4 py-3 rounded-xl text-sm font-medium bg-red-600/80 hover:bg-red-600 transition"
          >
            Logout
          </button>

          <div className="mt-4 text-xs text-blue-300 text-center">
            Anyprint Admin
          </div>
        </div>
      </aside>

      {/* ===== Main Area ===== */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* ===== Mobile Topbar ===== */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-blue-400/20 bg-[#0b1b3a]">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-white text-xl"
          >
            ☰
          </button>
          <span className="text-sm text-blue-300">
            Anyprint Admin
          </span>
        </div>

        {/* Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="w-full max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

function NavItem({
  href,
  label,
  active,
  onClick,
}: {
  href: string;
  label: string;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`block px-4 py-3 rounded-xl transition font-medium ${
        active
          ? "bg-blue-600 text-white shadow-[0_0_20px_rgba(59,130,246,0.3)]"
          : "text-blue-300 hover:bg-blue-900/40 hover:text-white"
      }`}
    >
      {label}
    </Link>
  );
}
