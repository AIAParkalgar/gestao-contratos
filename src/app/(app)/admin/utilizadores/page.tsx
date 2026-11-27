import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ROLE_LABELS, type Role } from "@/lib/constants";

export default async function UsersPage() {
  await requireAdmin();
  const users = await prisma.user.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: { teams: { orderBy: { name: "asc" } }, _count: { select: { contracts: true } } },
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Utilizadores</h1>
          <p className="text-sm text-slate-500">Crie contas e associe utilizadores às equipas.</p>
        </div>
        <Link href="/admin/utilizadores/novo" className="btn btn-primary">+ Novo utilizador</Link>
      </div>
      <div className="card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-2.5 font-medium">Nome</th>
              <th className="px-4 py-2.5 font-medium">Email</th>
              <th className="px-4 py-2.5 font-medium">Perfil</th>
              <th className="px-4 py-2.5 font-medium">Equipas</th>
              <th className="px-4 py-2.5 text-right font-medium">Contratos criados</th>
              <th className="px-4 py-2.5 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id} className={u.active ? "hover:bg-slate-50" : "bg-slate-50/60 text-slate-400"}>
                <td className="px-4 py-2.5">
                  <Link href={`/admin/utilizadores/${u.id}`} className="font-medium text-indigo-700 hover:underline">{u.name}</Link>
                </td>
                <td className="px-4 py-2.5">{u.email}</td>
                <td className="px-4 py-2.5">{ROLE_LABELS[u.role as Role] ?? u.role}</td>
                <td className="px-4 py-2.5">{u.teams.map((t) => t.name).join(", ") || "—"}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{u._count.contracts}</td>
                <td className="px-4 py-2.5">{u.active ? "Ativo" : "Inativo"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
