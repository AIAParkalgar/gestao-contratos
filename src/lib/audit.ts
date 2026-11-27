import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import type { CurrentUser } from "./auth";
import { VISIBILITY_LABELS, dateKindName, paymentParties, type Visibility } from "./constants";
import { formatDate, formatEUR, formatPercent } from "./format";

/** Tudo o que é preciso para descrever um contrato (página, histórico e exportação). */
export const contractFullInclude = {
  team: { select: { id: true, name: true } },
  creator: { select: { name: true } },
  responsible: { select: { id: true, name: true } },
  payments: { orderBy: [{ date: "asc" }, { order: "asc" }] },
  dates: { orderBy: [{ date: "asc" }, { order: "asc" }] },
  documents: { orderBy: { order: "asc" } },
} satisfies Prisma.ContractInclude;

export type FullContract = Prisma.ContractGetPayload<{ include: typeof contractFullInclude }>;

export type AuditChange = { field: string; label: string; before: string; after: string };

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  CRIADO: "Criou o contrato",
  ALTERADO: "Alterou o contrato",
  APAGADO: "Apagou o contrato",
};

/** Versão legível de cada campo, para comparar e mostrar no histórico. */
export function contractSnapshot(c: FullContract): Record<string, { label: string; value: string }> {
  const renewal = c.autoRenew
    ? `Sim, por períodos de ${c.renewalMonths ?? "?"} meses${c.noticeDays ? `, aviso prévio de ${c.noticeDays} dias` : ""}`
    : c.noticeDays
      ? `Não (aviso prévio de ${c.noticeDays} dias)`
      : "Não";
  return {
    type: { label: "Tipo", value: c.type },
    entity: { label: "Entidade contratante", value: c.entity },
    entityNif: { label: "NIF da entidade", value: c.entityNif ?? "" },
    contactName: { label: "Pessoa de contacto", value: c.contactName ?? "" },
    contactEmail: { label: "Email de contacto", value: c.contactEmail ?? "" },
    contactPhone: { label: "Telefone de contacto", value: c.contactPhone ?? "" },
    startDate: { label: "Data de início", value: formatDate(c.startDate) },
    endDate: { label: "Data de fim", value: formatDate(c.endDate) },
    renewal: { label: "Renovação automática", value: renewal },
    scope: { label: "Âmbito", value: c.scope ?? "" },
    obligations: { label: "Obrigações", value: c.obligations },
    visibility: { label: "Visibilidade", value: VISIBILITY_LABELS[c.visibility as Visibility] ?? c.visibility },
    team: { label: "Equipa", value: c.team?.name ?? "" },
    responsible: { label: "Responsável", value: c.responsible?.name ?? "" },
    documents: {
      label: "Documentos",
      value: c.documents.map((d) => `${d.name}: ${d.url}`).join("\n"),
    },
    payments: {
      label: "Calendário de pagamentos",
      value: c.payments
        .map((p) => {
          const { from, to } = paymentParties(p.direction, c.entity);
          const amount = p.mode === "VALOR"
            ? formatEUR(p.amountCents ?? 0)
            : `${formatPercent(p.percentage ?? 0)} de ${p.percentageBase ?? ""}`;
          return `${formatDate(p.date)} · ${from} → ${to} · ${amount}`;
        })
        .join("\n"),
    },
    dates: {
      label: "Outras datas relevantes",
      value: c.dates
        .map((d) => `${formatDate(d.date)} · ${dateKindName(d.kind, d.label)}${d.note ? ` (${d.note})` : ""}`)
        .join("\n"),
    },
  };
}

export function diffSnapshots(
  before: ReturnType<typeof contractSnapshot>,
  after: ReturnType<typeof contractSnapshot>,
): AuditChange[] {
  return Object.keys(after)
    .filter((k) => before[k]?.value !== after[k].value)
    .map((k) => ({ field: k, label: after[k].label, before: before[k]?.value ?? "", after: after[k].value }));
}

export async function logAudit(
  user: CurrentUser,
  data: { contractId: string; entity: string; action: "CRIADO" | "ALTERADO" | "APAGADO"; changes?: AuditChange[]; note?: string },
) {
  await prisma.auditLog.create({
    data: {
      contractId: data.contractId,
      entity: data.entity,
      userId: user.id,
      userName: user.name,
      action: data.action,
      changes: data.changes && data.changes.length ? (data.changes as unknown as Prisma.InputJsonValue) : undefined,
      note: data.note,
    },
  });
}
