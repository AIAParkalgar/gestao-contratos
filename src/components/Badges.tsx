import { VISIBILITY_LABELS, type Visibility } from "@/lib/constants";
import type { ContractStatus } from "@/lib/format";

const VIS_STYLES: Record<Visibility, string> = {
  PUBLICO: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  RESTRITO: "bg-amber-50 text-amber-800 ring-amber-600/20",
  CONFIDENCIAL: "bg-rose-50 text-rose-700 ring-rose-600/20",
};

const STATUS_STYLES: Record<ContractStatus["key"], string> = {
  FUTURO: "bg-sky-50 text-sky-700 ring-sky-600/20",
  ATIVO: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  A_TERMINAR: "bg-orange-50 text-orange-700 ring-orange-600/20",
  TERMINADO: "bg-slate-100 text-slate-600 ring-slate-500/20",
};

const base = "inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset";

export function VisibilityBadge({ value }: { value: string }) {
  const v = value as Visibility;
  return <span className={`${base} ${VIS_STYLES[v] ?? ""}`}>{VISIBILITY_LABELS[v] ?? value}</span>;
}

export function StatusBadge({ status }: { status: ContractStatus }) {
  return <span className={`${base} ${STATUS_STYLES[status.key]}`}>{status.label}</span>;
}
