import Link from "next/link";
import { AUDIT_ACTION_LABELS, type AuditChange } from "@/lib/audit";

type Entry = {
  id: string;
  contractId: string;
  entity: string;
  userName: string;
  action: string;
  changes: unknown;
  note: string | null;
  createdAt: Date;
};

const ACTION_STYLES: Record<string, string> = {
  CRIADO: "bg-emerald-50 text-emerald-700",
  ALTERADO: "bg-indigo-50 text-indigo-700",
  APAGADO: "bg-rose-50 text-rose-700",
};

const fmtDateTime = (d: Date) =>
  new Intl.DateTimeFormat("pt-PT", {
    timeZone: "Europe/Lisbon", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(d);

/** Lista de entradas do histórico. `showContract`: mostra o nome do contrato (vista geral). */
export default function AuditList({
  entries,
  showContract = false,
  existingIds,
}: {
  entries: Entry[];
  showContract?: boolean;
  existingIds?: Set<string>;
}) {
  if (entries.length === 0) return <p className="px-5 pb-5 text-sm text-slate-500">Sem registos.</p>;
  return (
    <ul className="divide-y divide-slate-100">
      {entries.map((e) => {
        const changes = (Array.isArray(e.changes) ? e.changes : []) as AuditChange[];
        const exists = existingIds ? existingIds.has(e.contractId) : true;
        return (
          <li key={e.id} className="px-5 py-3 text-sm" data-testid="audit-entry">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ACTION_STYLES[e.action] ?? "bg-slate-100 text-slate-700"}`}>
                {AUDIT_ACTION_LABELS[e.action] ?? e.action}
              </span>
              {showContract && (
                exists && e.action !== "APAGADO"
                  ? <Link href={`/contratos/${e.contractId}`} className="font-medium text-indigo-700 hover:underline">{e.entity}</Link>
                  : <span className="font-medium text-slate-700">{e.entity}</span>
              )}
              <span className="text-slate-600">por <strong className="font-medium text-slate-800">{e.userName}</strong></span>
              <span className="text-slate-400">· {fmtDateTime(e.createdAt)}</span>
            </div>
            {e.note && <p className="mt-1 text-slate-600">{e.note}</p>}
            {changes.length > 0 && (
              <details className="mt-1">
                <summary className="cursor-pointer text-slate-600 hover:text-slate-900">
                  {e.action === "APAGADO"
                    ? "Ver conteúdo do contrato apagado"
                    : `${changes.length} campo${changes.length === 1 ? "" : "s"}: ${changes.map((c) => c.label).join(", ")}`}
                </summary>
                <dl className="mt-2 space-y-2 rounded-md bg-slate-50 p-3">
                  {changes.map((c) => (
                    <div key={c.field}>
                      <dt className="text-xs font-medium text-slate-500">{c.label}</dt>
                      {e.action === "APAGADO" ? (
                        <dd className="whitespace-pre-wrap text-slate-700">{c.before}</dd>
                      ) : (
                        <dd className="grid gap-1 sm:grid-cols-2">
                          <span className="whitespace-pre-wrap rounded bg-rose-50 px-2 py-1 text-rose-900 line-through decoration-rose-300">
                            {c.before || <em className="no-underline">vazio</em>}
                          </span>
                          <span className="whitespace-pre-wrap rounded bg-emerald-50 px-2 py-1 text-emerald-900">
                            {c.after || <em>vazio</em>}
                          </span>
                        </dd>
                      )}
                    </div>
                  ))}
                </dl>
              </details>
            )}
          </li>
        );
      })}
    </ul>
  );
}
