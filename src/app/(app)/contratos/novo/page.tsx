import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import ContractForm from "@/components/ContractForm";

export default async function NewContractPage() {
  const user = await requireUser();
  const teams = user.role === "ADMIN"
    ? await prisma.team.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } })
    : user.teams;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Novo contrato</h1>
      <ContractForm
        contractId={null}
        teams={teams}
        cancelHref="/contratos"
        initial={{
          type: "",
          entity: "",
          startDate: "",
          endDate: "",
          scope: "",
          obligations: "",
          documentUrl: "",
          visibility: "RESTRITO",
          teamId: teams.length === 1 ? teams[0].id : "",
          payments: [],
          dates: [],
        }}
      />
    </div>
  );
}
