import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/constants";
import { logout } from "../login/actions";
import NavLinks from "@/components/NavLinks";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const links = [
    { href: "/contratos", label: "Contratos" },
    { href: "/calendario", label: "Calendário" },
    { href: "/contratos/novo", label: "Novo contrato" },
    ...(user.role === "ADMIN"
      ? [
          { href: "/admin/utilizadores", label: "Utilizadores" },
          { href: "/admin/equipas", label: "Equipas" },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/contratos" className="font-semibold text-slate-900">Gestão de Contratos</Link>
            <NavLinks links={links} />
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Link href="/conta" className="text-right leading-tight hover:underline">
              <span className="block font-medium text-slate-800">{user.name}</span>
              <span className="block text-xs text-slate-500">
                {ROLE_LABELS[user.role]}
                {user.teams.length > 0 && ` · ${user.teams.map((t) => t.name).join(", ")}`}
              </span>
            </Link>
            <form action={logout}>
              <button type="submit" className="btn btn-secondary px-3 py-1.5">Sair</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
