import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { contractAccessWhere } from "@/lib/access";
import { contractFullInclude } from "@/lib/audit";
import { contractToFormValues, responsibleOptions } from "@/lib/contractFormValues";
import ContractForm, { type ContractFormValues } from "@/components/ContractForm";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function NewContractPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const sp = await searchParams;
  const sourceId = typeof sp.de === "string" ? sp.de : null;

  const [teams, users, source] = await Promise.all([
    user.role === "ADMIN"
      ? prisma.team.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } })
      : Promise.resolve(user.teams),
    responsibleOptions(),
    sourceId
      ? prisma.contract.findFirst({ where: { AND: [{ id: sourceId }, contractAccessWhere(user)] }, include: contractFullInclude })
      : Promise.resolve(null),
  ]);

  let initial: ContractFormValues;
  if (source) {
    // Duplicar: copia tudo; a equipa só se mantém se o utilizador lhe puder associar contratos.
    initial = { ...contractToFormValues(source, "copia-"), responsibleId: user.id };
    if (initial.teamId && !teams.some((t) => t.id === initial.teamId)) initial.teamId = "";
  } else {
    initial = {
      type: "", entity: "", entityNif: "", contactName: "", contactEmail: "", contactPhone: "",
      startDate: "", endDate: "", autoRenew: false, renewalMonths: "", noticeDays: "",
      scope: "", obligations: "", visibility: "RESTRITO",
      teamId: teams.length === 1 ? teams[0].id : "",
      responsibleId: user.id,
      documents: [], payments: [], dates: [],
    };
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Novo contrato</h1>
        {source && (
          <p className="mt-1 rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-900">
            Cópia de <Link href={`/contratos/${source.id}`} className="font-medium underline">{source.entity}</Link>.
            Reveja as datas, os pagamentos e os documentos antes de criar.
          </p>
        )}
      </div>
      <ContractForm contractId={null} teams={teams} users={users} cancelHref={source ? `/contratos/${source.id}` : "/contratos"}
        initial={initial} duplicatedFrom={source?.id ?? null} />
    </div>
  );
}
