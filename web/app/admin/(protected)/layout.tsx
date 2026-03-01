"use client";

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
      
      {/* Sidebar */}
      <aside className="w-64 bg-[#0b1b3a] border-r border-blue-400/20 flex flex-col">
        
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
          />
          <NavItem
            href="/admin/orders"
            label="Order List"
            active={pathname.startsWith("/admin/orders")}
          />
        </nav>

        {/* Logout Section */}
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

      {/* Content */}
      <main className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

function NavItem({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
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
