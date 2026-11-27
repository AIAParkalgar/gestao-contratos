import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import TeamForm from "@/components/TeamForm";

export default async function NewTeamPage() {
  await requireAdmin();
  const users = await prisma.user.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    select: { id: true, name: true, email: true, active: true },
  });
  return (
    <div className="space-y-5">
      <div>
        <Link href="/admin/equipas" className="text-sm text-slate-500 hover:text-slate-800">← Equipas</Link>
        <h1 className="mt-2 text-xl font-semibold text-slate-900">Nova equipa</h1>
      </div>
      <TeamForm teamId={null} initialName="" initialMemberIds={[]} users={users} />
    </div>
  );
}
