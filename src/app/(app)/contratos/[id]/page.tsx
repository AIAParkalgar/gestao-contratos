import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canEditContract, contractAccessWhere } from "@/lib/access";
import { VISIBILITY_HELP, dateKindName, paymentParties, type Visibility } from "@/lib/constants";
import { contractStatus, formatDate, formatEUR, formatPercent } from "@/lib/format";
import { DirectionBadge, StatusBadge, VisibilityBadge } from "@/components/Badges";
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
      dates: { orderBy: [{ date: "asc" }, { order: "asc" }] },
    },
  });
  if (!contract) notFound();

  const editable = canEditContract(user, contract);
  const fixed = (dir: string) =>
    contract.payments.filter((p) => p.direction === dir).reduce((s, p) => s + (p.amountCents ?? 0), 0);
  const totalIn = fixed("ENTIDADE_PARA_PARKALGAR");
  const totalOut = fixed("PARKALGAR_PARA_ENTIDADE");
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
          <div className="flex flex-wrap gap-2">
            {contract.documentUrl && (
              <a href={contract.documentUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                Abrir documento ↗
              </a>
            )}
            {editable && (
              <>
                <Link href={`/contratos/${contract.id}/editar`} className="btn btn-secondary">Editar</Link>
                <DeleteContractButton contractId={contract.id} />
              </>
            )}
          </div>
        </div>
      </div>

      <section className="card p-5">
        <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Data de início">{formatDate(contract.startDate)}</Field>
          <Field label="Data de fim">{formatDate(contract.endDate)}</Field>
          <Field label="Equipa">{contract.team?.name ?? "—"}</Field>
          <Field label="Criado por">{contract.creator.name}</Field>
          <div className="sm:col-span-2">
            <dt className="text-slate-500">Acesso</dt>
            <dd className="mt-0.5 text-slate-900">{VISIBILITY_HELP[contract.visibility as Visibility]}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-slate-500">Documento</dt>
            <dd className="mt-0.5 truncate">
              {contract.documentUrl ? (
                <a href={contract.documentUrl} target="_blank" rel="noopener noreferrer"
                  className="text-indigo-700 hover:underline" title={contract.documentUrl}>
                  {contract.documentUrl}
                </a>
              ) : (
                <span className="text-slate-400">Sem link</span>
              )}
            </dd>
          </div>
        </dl>
      </section>

      <section className="card p-5">
        <h2 className="mb-2 text-base font-semibold text-slate-900">Âmbito</h2>
        {contract.scope ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{contract.scope}</p>
        ) : (
          <p className="text-sm text-slate-400">Sem âmbito definido.</p>
        )}
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
                  <th className="px-5 py-2 font-medium">Sentido</th>
                  <th className="px-5 py-2 text-right font-medium">Montante</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contract.payments.map((p) => {
                  const parties = paymentParties(p.direction, contract.entity);
                  return (
                    <tr key={p.id}>
                      <td className="px-5 py-2 whitespace-nowrap">{formatDate(p.date)}</td>
                      <td className="px-5 py-2">{parties.from}</td>
                      <td className="px-5 py-2">{parties.to}</td>
                      <td className="px-5 py-2"><DirectionBadge direction={p.direction} /></td>
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
                  );
                })}
              </tbody>
              {(totalIn > 0 || totalOut > 0) && (
                <tfoot className="border-t border-slate-200 bg-slate-50">
                  {totalIn > 0 && (
                    <tr>
                      <td colSpan={4} className="px-5 py-2 font-medium text-slate-700">Total a receber (valores fixos)</td>
                      <td className="px-5 py-2 text-right font-semibold text-emerald-700 tabular-nums">{formatEUR(totalIn)}</td>
                    </tr>
                  )}
                  {totalOut > 0 && (
                    <tr>
                      <td colSpan={4} className="px-5 py-2 font-medium text-slate-700">Total a pagar (valores fixos)</td>
                      <td className="px-5 py-2 text-right font-semibold text-rose-700 tabular-nums">{formatEUR(totalOut)}</td>
                    </tr>
                  )}
                  {hasPct && (
                    <tr>
                      <td colSpan={5} className="px-5 pb-2 text-xs text-slate-500">Os totais não incluem pagamentos em percentagem.</td>
                    </tr>
                  )}
                </tfoot>
              )}
            </table>
          </div>
        )}
      </section>

      <section className="card overflow-hidden">
        <h2 className="px-5 pt-5 pb-3 text-base font-semibold text-slate-900">Outras datas relevantes</h2>
        {contract.dates.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-slate-500">Sem outras datas registadas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-y border-slate-200 bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-5 py-2 font-medium">Data</th>
                  <th className="px-5 py-2 font-medium">Tipo</th>
                  <th className="px-5 py-2 font-medium">Nota</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contract.dates.map((d) => (
                  <tr key={d.id}>
                    <td className="px-5 py-2 whitespace-nowrap">{formatDate(d.date)}</td>
                    <td className="px-5 py-2 font-medium">{dateKindName(d.kind, d.label)}</td>
                    <td className="px-5 py-2 text-slate-600">{d.note || "—"}</td>
                  </tr>
                ))}
              </tbody>
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
