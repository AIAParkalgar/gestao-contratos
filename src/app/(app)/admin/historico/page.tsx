import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import AuditList from "@/components/AuditList";

export default async function HistoryPage() {
  await requireAdmin();
  const entries = await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  const existing = await prisma.contract.findMany({
    where: { id: { in: [...new Set(entries.map((e) => e.contractId))] } },
    select: { id: true },
  });
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Histórico</h1>
        <p className="text-sm text-slate-500">Últimas 200 alterações a contratos, incluindo contratos apagados.</p>
      </div>
      <section className="card overflow-hidden">
        <AuditList entries={entries} showContract existingIds={new Set(existing.map((c) => c.id))} />
      </section>
    </div>
  );
}
