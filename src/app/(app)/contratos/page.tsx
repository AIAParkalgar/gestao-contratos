import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { VISIBILITIES, VISIBILITY_LABELS } from "@/lib/constants";
import { contractListWhere, hasActiveFilters, readContractFilters } from "@/lib/contractFilters";
import { contractStatus, formatDate } from "@/lib/format";
import { currentTermEnd } from "@/lib/terms";
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
  const f = readContractFilters(sp);

  const [contracts, teams] = await Promise.all([
    prisma.contract.findMany({
      where: contractListWhere(user, f),
      include: {
        team: { select: { name: true } },
        responsible: { select: { name: true } },
        _count: { select: { payments: true } },
      },
      orderBy: [{ endDate: "asc" }],
    }),
    prisma.team.findMany({ orderBy: { name: "asc" } }),
  ]);
  const rows = contracts
    .map((c) => ({ c, term: currentTermEnd(c) }))
    .sort((a, b) => a.term.end.getTime() - b.term.end.getTime());
  const filtered = hasActiveFilters(f);

  const exportParams = new URLSearchParams();
  for (const [k, v] of Object.entries({ q: f.q, visibilidade: f.visibilidade, equipa: f.equipa, estado: f.estado })) {
    if (v) exportParams.set(k, v);
  }
  if (f.meus) exportParams.set("meus", "1");
  if (f.resp) exportParams.set("resp", "1");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Contratos</h1>
          <p className="text-sm text-slate-500">
            {user.role === "ADMIN"
              ? "Todos os contratos da plataforma."
              : "Contratos públicos, da sua equipa, criados por si ou de que é responsável."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {user.role === "ADMIN" && (
            <a href={`/contratos/exportar${exportParams.size ? `?${exportParams}` : ""}`} className="btn btn-secondary">
              Exportar Excel
            </a>
          )}
          <Link href="/contratos/novo" className="btn btn-primary">+ Novo contrato</Link>
        </div>
      </div>

      <form className="card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[1.4fr_1.1fr_1fr_1fr]" method="get">
        <input name="q" defaultValue={f.q} className="input" placeholder="Pesquisar entidade, tipo, âmbito, NIF…" aria-label="Pesquisar" />
        <select name="visibilidade" defaultValue={f.visibilidade} className="input" aria-label="Visibilidade">
          <option value="">Todas as visibilidades</option>
          {VISIBILITIES.map((v) => <option key={v} value={v}>{VISIBILITY_LABELS[v]}</option>)}
        </select>
        <select name="equipa" defaultValue={f.equipa} className="input" aria-label="Equipa">
          <option value="">Todas as equipas</option>
          {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select name="estado" defaultValue={f.estado} className="input" aria-label="Estado">
          <option value="">Todos os estados</option>
          {STATES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:col-span-2 lg:col-span-4">
          <label className="flex items-center gap-2 text-sm whitespace-nowrap text-slate-700">
            <input type="checkbox" name="resp" value="1" defaultChecked={f.resp} className="accent-indigo-600" />
            Sou responsável
          </label>
          <label className="flex items-center gap-2 text-sm whitespace-nowrap text-slate-700">
            <input type="checkbox" name="meus" value="1" defaultChecked={f.meus} className="accent-indigo-600" />
            Criados por mim
          </label>
          <button type="submit" className="btn btn-secondary">Filtrar</button>
          {filtered && <Link href="/contratos" className="text-sm text-slate-500 hover:underline">Limpar</Link>}
        </div>
      </form>

      <div className="card overflow-hidden">
        {rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">
            {filtered ? "Nenhum contrato corresponde aos filtros." : "Ainda não existem contratos."}
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
                  <th className="px-4 py-2.5 font-medium">Responsável</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map(({ c, term }) => (
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
                      {formatDate(c.startDate)} – {formatDate(term.end)}
                      {c.autoRenew && <span className="block text-xs text-slate-500">↻ renovação automática</span>}
                    </td>
                    <td className="px-4 py-2.5"><StatusBadge status={contractStatus(c.startDate, term.end, c.autoRenew)} /></td>
                    <td className="px-4 py-2.5"><VisibilityBadge value={c.visibility} /></td>
                    <td className="px-4 py-2.5 text-slate-700">{c.team?.name ?? "—"}</td>
                    <td className="px-4 py-2.5 text-slate-700">{c.responsible?.name ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="text-xs text-slate-500">{rows.length} contrato{rows.length === 1 ? "" : "s"}</p>
    </div>
  );
}
