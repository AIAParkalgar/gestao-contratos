import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function TeamsPage() {
  await requireAdmin();
  const [teams, restricted] = await Promise.all([
    prisma.team.findMany({
      orderBy: { name: "asc" },
      include: {
        users: { where: { active: true }, select: { name: true }, orderBy: { name: "asc" } },
        _count: { select: { contracts: true } },
      },
    }),
    prisma.contract.groupBy({ by: ["teamId"], where: { visibility: "RESTRITO" }, _count: true }),
  ]);
  const restrictedBy = new Map(restricted.map((r) => [r.teamId, r._count]));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Equipas</h1>
          <p className="text-sm text-slate-500">Os membros de uma equipa veem os contratos restritos a essa equipa.</p>
        </div>
        <Link href="/admin/equipas/nova" className="btn btn-primary">+ Nova equipa</Link>
      </div>
      <div className="card overflow-x-auto">
        {teams.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">Ainda não existem equipas.</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-2.5 font-medium">Equipa</th>
                <th className="px-4 py-2.5 font-medium">Membros ativos</th>
                <th className="px-4 py-2.5 text-right font-medium">Contratos</th>
                <th className="px-4 py-2.5 text-right font-medium">Restritos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {teams.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5">
                    <Link href={`/admin/equipas/${t.id}`} className="font-medium text-indigo-700 hover:underline">{t.name}</Link>
                  </td>
                  <td className="px-4 py-2.5 text-slate-700">
                    {t.users.length === 0 ? <span className="text-slate-400">—</span> : (
                      <>
                        <span className="tabular-nums">{t.users.length}</span>
                        <span className="text-slate-500"> · {t.users.slice(0, 4).map((u) => u.name).join(", ")}{t.users.length > 4 ? "…" : ""}</span>
                      </>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{t._count.contracts}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{restrictedBy.get(t.id) ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
