import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { Role } from "@/lib/constants";
import UserForm from "@/components/UserForm";

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = await requireAdmin();
  const [user, teams] = await Promise.all([
    prisma.user.findUnique({ where: { id }, include: { teams: true } }),
    prisma.team.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!user) notFound();

  return (
    <div className="space-y-5">
      <div>
        <Link href="/admin/utilizadores" className="text-sm text-slate-500 hover:text-slate-800">← Utilizadores</Link>
        <h1 className="mt-2 text-xl font-semibold text-slate-900">Editar utilizador</h1>
      </div>
      <UserForm userId={user.id} teams={teams} isSelf={user.id === admin.id}
        initial={{
          name: user.name,
          email: user.email,
          role: user.role as Role,
          active: user.active,
          teamIds: user.teams.map((t) => t.id),
        }} />
    </div>
  );
}
