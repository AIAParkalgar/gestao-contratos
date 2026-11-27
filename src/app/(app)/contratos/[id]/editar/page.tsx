import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canEditContract, contractAccessWhere } from "@/lib/access";
import { dateToISO } from "@/lib/format";
import type { DateKind, PaymentDirection, PaymentMode, Visibility } from "@/lib/constants";
import ContractForm from "@/components/ContractForm";

export default async function EditContractPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const contract = await prisma.contract.findFirst({
    where: { AND: [{ id }, contractAccessWhere(user)] },
    include: {
      team: true,
      payments: { orderBy: [{ order: "asc" }, { date: "asc" }] },
      dates: { orderBy: [{ order: "asc" }, { date: "asc" }] },
    },
  });
  if (!contract || !canEditContract(user, contract)) notFound();

  const teams = user.role === "ADMIN"
    ? await prisma.team.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } })
    : [...user.teams];
  if (contract.team && !teams.some((t) => t.id === contract.team!.id)) {
    teams.push({ id: contract.team.id, name: contract.team.name });
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Editar contrato</h1>
      <ContractForm
        contractId={contract.id}
        teams={teams}
        cancelHref={`/contratos/${contract.id}`}
        initial={{
          type: contract.type,
          entity: contract.entity,
          startDate: dateToISO(contract.startDate),
          endDate: dateToISO(contract.endDate),
          obligations: contract.obligations,
          documentUrl: contract.documentUrl ?? "",
          visibility: contract.visibility as Visibility,
          teamId: contract.teamId ?? "",
          payments: contract.payments.map((p) => ({
            key: p.id,
            direction: p.direction as PaymentDirection,
            date: dateToISO(p.date),
            mode: p.mode as PaymentMode,
            amount: p.amountCents != null ? (p.amountCents / 100).toFixed(2) : "",
            percentage: p.percentage != null ? String(p.percentage) : "",
            percentageBase: p.percentageBase ?? "",
          })),
          dates: contract.dates.map((x) => ({
            key: x.id,
            kind: x.kind as DateKind,
            label: x.label ?? "",
            date: dateToISO(x.date),
            note: x.note ?? "",
          })),
        }}
      />
    </div>
  );
}
