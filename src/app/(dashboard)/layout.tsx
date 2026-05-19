import type { ReactNode } from "react";
import Link from "next/link";

const navItems = [
  { label: "Dashboard", href: "/" },
  { label: "Upload", href: "/upload" },
  { label: "Follow-ups", href: "/followups" },
  { label: "Settings", href: "/settings" },
] as const;

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-64 border-r bg-muted/10 p-4 hidden md:flex flex-col gap-2">
        <Link href="/" className="text-lg font-bold px-3 py-2">
          MicroNest
        </Link>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
