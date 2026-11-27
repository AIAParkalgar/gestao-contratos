import type { ContractFormValues } from "@/components/ContractForm";
import type { DateKind, PaymentDirection, PaymentMode, Visibility } from "./constants";
import type { FullContract } from "./audit";
import { prisma } from "./db";
import { dateToISO } from "./format";

/** Valores do formulário a partir de um contrato existente (editar ou duplicar). */
export function contractToFormValues(c: FullContract, keyPrefix = ""): ContractFormValues {
  return {
    type: c.type,
    entity: c.entity,
    entityNif: c.entityNif ?? "",
    contactName: c.contactName ?? "",
    contactEmail: c.contactEmail ?? "",
    contactPhone: c.contactPhone ?? "",
    startDate: dateToISO(c.startDate),
    endDate: dateToISO(c.endDate),
    autoRenew: c.autoRenew,
    renewalMonths: c.renewalMonths != null ? String(c.renewalMonths) : "",
    noticeDays: c.noticeDays != null ? String(c.noticeDays) : "",
    scope: c.scope ?? "",
    obligations: c.obligations,
    visibility: c.visibility as Visibility,
    teamId: c.teamId ?? "",
    responsibleId: c.responsibleId ?? "",
    documents: c.documents.map((d) => ({ key: keyPrefix + d.id, name: d.name, url: d.url })),
    payments: c.payments.map((p) => ({
      key: keyPrefix + p.id,
      direction: p.direction as PaymentDirection,
      date: dateToISO(p.date),
      mode: p.mode as PaymentMode,
      amount: p.amountCents != null ? (p.amountCents / 100).toFixed(2) : "",
      percentage: p.percentage != null ? String(p.percentage) : "",
      percentageBase: p.percentageBase ?? "",
    })),
    dates: c.dates.map((d) => ({
      key: keyPrefix + d.id,
      kind: d.kind as DateKind,
      label: d.label ?? "",
      date: dateToISO(d.date),
      note: d.note ?? "",
    })),
  };
}

/** Pessoas que podem ser responsáveis: utilizadores ativos (+ o atual, se estiver inativo). */
export async function responsibleOptions(currentId?: string | null) {
  return prisma.user.findMany({
    where: { OR: [{ active: true }, ...(currentId ? [{ id: currentId }] : [])] },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}
