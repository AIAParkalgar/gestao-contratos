import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { contractAccessWhere } from "@/lib/access";
import { VISIBILITIES, VISIBILITY_LABELS } from "@/lib/constants";
import { contractStatus, formatDate, isoToDate, todayISO } from "@/lib/format";
import { StatusBadge, VisibilityBadge } from "@/components/Badges";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const STATES = [
  { value: "ativo", label: "Ativos" },
  { value: "futuro", label: "Por iniciar" },
  { value: "terminado", label: "Terminados" },
];

export default async function ContractsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string).trim() : "");
  const q = str("q");
  const visibilidade = str("visibilidade");
  const equipa = str("equipa");
  const estado = str("estado");
  const meus = str("meus") === "1";

  const today = isoToDate(todayISO());
  const filters: Prisma.ContractWhereInput[] = [contractAccessWhere(user)];
  if (q) {
    filters.push({
      OR: [
        { entity: { contains: q, mode: "insensitive" } },
        { type: { contains: q, mode: "insensitive" } },
        { scope: { contains: q, mode: "insensitive" } },
        { obligations: { contains: q, mode: "insensitive" } },
      ],
    });
  }
  if ((VISIBILITIES as readonly string[]).includes(visibilidade)) filters.push({ visibility: visibilidade });
  if (equipa) filters.push({ teamId: equipa });
  if (meus) filters.push({ creatorId: user.id });
  if (estado === "ativo") filters.push({ startDate: { lte: today }, endDate: { gte: today } });
  if (estado === "futuro") filters.push({ startDate: { gt: today } });
  if (estado === "terminado") filters.push({ endDate: { lt: today } });

  const [contracts, teams] = await Promise.all([
    prisma.contract.findMany({
      where: { AND: filters },
      include: { team: { select: { name: true } }, creator: { select: { name: true } }, _count: { select: { payments: true } } },
      orderBy: [{ endDate: "asc" }],
    }),
    prisma.team.findMany({ orderBy: { name: "asc" } }),
  ]);
  const hasFilters = q || visibilidade || equipa || estado || meus;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Contratos</h1>
          <p className="text-sm text-slate-500">
            {user.role === "ADMIN" ? "Todos os contratos da plataforma." : "Contratos públicos, da sua equipa e criados por si."}
          </p>
        </div>
        <Link href="/contratos/novo" className="btn btn-primary">+ Novo contrato</Link>
      </div>

      <form className="card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[1.4fr_1.1fr_1fr_1fr_auto]" method="get">
        <input name="q" defaultValue={q} className="input" placeholder="Pesquisar entidade, tipo, âmbito ou obrigações…" aria-label="Pesquisar" />
        <select name="visibilidade" defaultValue={visibilidade} className="input" aria-label="Visibilidade">
          <option value="">Todas as visibilidades</option>
          {VISIBILITIES.map((v) => <option key={v} value={v}>{VISIBILITY_LABELS[v]}</option>)}
        </select>
        <select name="equipa" defaultValue={equipa} className="input" aria-label="Equipa">
          <option value="">Todas as equipas</option>
          {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select name="estado" defaultValue={estado} className="input" aria-label="Estado">
          <option value="">Todos os estados</option>
          {STATES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-1">
          <label className="flex items-center gap-2 text-sm whitespace-nowrap text-slate-700">
            <input type="checkbox" name="meus" value="1" defaultChecked={meus} className="accent-indigo-600" />
            Só os meus
          </label>
          <button type="submit" className="btn btn-secondary">Filtrar</button>
          {hasFilters && <Link href="/contratos" className="text-sm text-slate-500 hover:underline">Limpar</Link>}
        </div>
      </form>

      <div className="card overflow-hidden">
        {contracts.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">
            {hasFilters ? "Nenhum contrato corresponde aos filtros." : "Ainda não existem contratos."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Entidade</th>
                  <th className="px-4 py-2.5 font-medium">Tipo</th>
                  <th className="px-4 py-2.5 font-medium">Período</th>
                  <th className="px-4 py-2.5 font-medium">Estado</th>
                  <th className="px-4 py-2.5 font-medium">Visibilidade</th>
                  <th className="px-4 py-2.5 font-medium">Equipa</th>
                  <th className="px-4 py-2.5 font-medium">Criado por</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contracts.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5">
                      <Link href={`/contratos/${c.id}`} className="font-medium text-indigo-700 hover:underline">{c.entity}</Link>
                      {c.scope && (
                        <span className="block max-w-xs truncate text-xs text-slate-500" title={c.scope}>{c.scope}</span>
                      )}
                      {c._count.payments > 0 && (
                        <span className="block text-xs text-slate-500">
                          {c._count.payments} pagamento{c._count.payments === 1 ? "" : "s"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-slate-700">{c.type}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-slate-700">
                      {formatDate(c.startDate)} – {formatDate(c.endDate)}
                    </td>
                    <td className="px-4 py-2.5"><StatusBadge status={contractStatus(c.startDate, c.endDate)} /></td>
                    <td className="px-4 py-2.5"><VisibilityBadge value={c.visibility} /></td>
                    <td className="px-4 py-2.5 text-slate-700">{c.team?.name ?? "—"}</td>
                    <td className="px-4 py-2.5 text-slate-700">{c.creator.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="text-xs text-slate-500">{contracts.length} contrato{contracts.length === 1 ? "" : "s"}</p>
    </div>
  );
}
