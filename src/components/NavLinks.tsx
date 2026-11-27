"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavLinks({ links }: { links: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-1">
      {links.map((l) => {
        const active = l.href === "/contratos"
          ? pathname === "/contratos" || (pathname.startsWith("/contratos/") && pathname !== "/contratos/novo")
          : pathname.startsWith(l.href);
        return (
          <Link key={l.href} href={l.href}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${active ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
