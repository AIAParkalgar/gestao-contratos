import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import TeamForm from "@/components/TeamForm";
import DeleteTeamForm from "@/components/DeleteTeamForm";

export default async function EditTeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdmin();
  const [team, users, otherTeams, restrictedCount] = await Promise.all([
    prisma.team.findUnique({
      where: { id },
      include: { users: { select: { id: true } }, _count: { select: { contracts: true } } },
    }),
    prisma.user.findMany({
      orderBy: [{ active: "desc" }, { name: "asc" }],
      select: { id: true, name: true, email: true, active: true },
    }),
    prisma.team.findMany({ where: { NOT: { id } }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.contract.count({ where: { teamId: id, visibility: "RESTRITO" } }),
  ]);
  if (!team) notFound();

  return (
    <div className="space-y-5">
      <div>
        <Link href="/admin/equipas" className="text-sm text-slate-500 hover:text-slate-800">← Equipas</Link>
        <h1 className="mt-2 text-xl font-semibold text-slate-900">Editar equipa</h1>
        {team._count.contracts > 0 && (
          <Link href={`/contratos?equipa=${team.id}`} className="text-sm text-indigo-700 hover:underline">
            {team._count.contracts === 1 ? "Ver o contrato desta equipa" : `Ver os ${team._count.contracts} contratos desta equipa`} →
          </Link>
        )}
      </div>
      <TeamForm teamId={team.id} initialName={team.name} initialMemberIds={team.users.map((u) => u.id)} users={users} />
      <DeleteTeamForm
        teamId={team.id}
        teamName={team.name}
        contractCount={team._count.contracts}
        restrictedCount={restrictedCount}
        memberCount={team.users.length}
        otherTeams={otherTeams}
      />
    </div>
  );
}
