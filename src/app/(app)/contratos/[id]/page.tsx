import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canEditContract, contractAccessWhere } from "@/lib/access";
import { VISIBILITY_HELP, type Visibility } from "@/lib/constants";
import { contractStatus, formatDate, formatEUR, formatPercent } from "@/lib/format";
import { StatusBadge, VisibilityBadge } from "@/components/Badges";
import DeleteContractButton from "@/components/DeleteContractButton";

export default async function ContractPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const contract = await prisma.contract.findFirst({
    where: { AND: [{ id }, contractAccessWhere(user)] },
    include: {
      team: true,
      creator: { select: { name: true } },
      payments: { orderBy: [{ date: "asc" }, { order: "asc" }] },
    },
  });
  if (!contract) notFound();

  const editable = canEditContract(user, contract);
  const totalFixed = contract.payments.reduce((s, p) => s + (p.amountCents ?? 0), 0);
  const hasPct = contract.payments.some((p) => p.mode === "PERCENTAGEM");

  return (
    <div className="space-y-6">
      <div>
        <Link href="/contratos" className="text-sm text-slate-500 hover:text-slate-800">← Contratos</Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">{contract.type}</p>
            <h1 className="text-2xl font-semibold text-slate-900">{contract.entity}</h1>
            <div className="mt-2 flex flex-wrap gap-2">
              <StatusBadge status={contractStatus(contract.startDate, contract.endDate)} />
              <VisibilityBadge value={contract.visibility} />
            </div>
          </div>
          {editable && (
            <div className="flex gap-2">
              <Link href={`/contratos/${contract.id}/editar`} className="btn btn-secondary">Editar</Link>
              <DeleteContractButton contractId={contract.id} />
            </div>
          )}
        </div>
      </div>

      <section className="card p-5">
        <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Data de início">{formatDate(contract.startDate)}</Field>
          <Field label="Data de fim">{formatDate(contract.endDate)}</Field>
          <Field label="Equipa">{contract.team?.name ?? "—"}</Field>
          <Field label="Criado por">{contract.creator.name}</Field>
          <div className="sm:col-span-2 lg:col-span-4">
            <dt className="text-slate-500">Acesso</dt>
            <dd className="mt-0.5 text-slate-900">{VISIBILITY_HELP[contract.visibility as Visibility]}</dd>
          </div>
        </dl>
      </section>

      <section className="card p-5">
        <h2 className="mb-2 text-base font-semibold text-slate-900">Obrigações</h2>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{contract.obligations}</p>
      </section>

      <section className="card overflow-hidden">
        <h2 className="px-5 pt-5 pb-3 text-base font-semibold text-slate-900">Calendário de pagamentos</h2>
        {contract.payments.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-slate-500">Sem pagamentos definidos.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-y border-slate-200 bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-5 py-2 font-medium">Data</th>
                  <th className="px-5 py-2 font-medium">De</th>
                  <th className="px-5 py-2 font-medium">Para</th>
                  <th className="px-5 py-2 text-right font-medium">Montante</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contract.payments.map((p) => (
                  <tr key={p.id}>
                    <td className="px-5 py-2 whitespace-nowrap">{formatDate(p.date)}</td>
                    <td className="px-5 py-2">{p.fromParty}</td>
                    <td className="px-5 py-2">{p.toParty}</td>
                    <td className="px-5 py-2 text-right">
                      {p.mode === "VALOR" ? (
                        <span className="font-medium tabular-nums">{formatEUR(p.amountCents ?? 0)}</span>
                      ) : (
                        <span>
                          <span className="font-medium tabular-nums">{formatPercent(p.percentage ?? 0)}</span>
                          <span className="text-slate-500"> de {p.percentageBase}</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              {totalFixed > 0 && (
                <tfoot className="border-t border-slate-200 bg-slate-50">
                  <tr>
                    <td colSpan={3} className="px-5 py-2 font-medium text-slate-700">
                      Total de valores fixos{hasPct && <span className="font-normal text-slate-500"> (exclui pagamentos em percentagem)</span>}
                    </td>
                    <td className="px-5 py-2 text-right font-semibold tabular-nums">{formatEUR(totalFixed)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className="mt-0.5 font-medium text-slate-900">{children}</dd>
    </div>
  );
}
