import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canEditContract, contractAccessWhere } from "@/lib/access";
import { contractFullInclude } from "@/lib/audit";
import { contractToFormValues, responsibleOptions } from "@/lib/contractFormValues";
import ContractForm from "@/components/ContractForm";

export default async function EditContractPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const contract = await prisma.contract.findFirst({
    where: { AND: [{ id }, contractAccessWhere(user)] },
    include: contractFullInclude,
  });
  if (!contract || !canEditContract(user, contract)) notFound();

  const teams = user.role === "ADMIN"
    ? await prisma.team.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } })
    : [...user.teams];
  if (contract.team && !teams.some((t) => t.id === contract.team!.id)) {
    teams.push({ id: contract.team.id, name: contract.team.name });
  }
  const users = await responsibleOptions(contract.responsibleId);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Editar contrato</h1>
      <ContractForm contractId={contract.id} teams={teams} users={users}
        cancelHref={`/contratos/${contract.id}`} initial={contractToFormValues(contract)} />
    </div>
  );
}
