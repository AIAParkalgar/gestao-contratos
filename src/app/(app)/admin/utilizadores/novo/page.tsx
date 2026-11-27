import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import UserForm from "@/components/UserForm";

export default async function NewUserPage() {
  await requireAdmin();
  const teams = await prisma.team.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
  return (
    <div className="space-y-5">
      <div>
        <Link href="/admin/utilizadores" className="text-sm text-slate-500 hover:text-slate-800">← Utilizadores</Link>
        <h1 className="mt-2 text-xl font-semibold text-slate-900">Novo utilizador</h1>
      </div>
      <UserForm userId={null} teams={teams} isSelf={false}
        initial={{ name: "", email: "", role: "USER", active: true, teamIds: [] }} />
    </div>
  );
}
