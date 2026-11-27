import { prisma } from "./db";
import { contractAccessWhere } from "./access";
import type { CurrentUser } from "./auth";
import { dateKindName } from "./constants";
import { dateToISO, formatEUR, formatPercent } from "./format";

export const EVENT_CATEGORIES = ["contratos", "pagamentos", "datas"] as const;
export type EventCategory = (typeof EVENT_CATEGORIES)[number];
export const EVENT_CATEGORY_LABELS: Record<EventCategory, string> = {
  contratos: "Início e fim de contrato",
  pagamentos: "Pagamentos",
  datas: "Outras datas relevantes",
};

/** Cor do evento: define o estilo no calendário. */
export type EventTone = "contrato" | "receber" | "pagar" | "data";

export type CalendarEvent = {
  key: string;
  iso: string; // AAAA-MM-DD
  category: EventCategory;
  tone: EventTone;
  label: string; // ex.: "Fim de contrato", "A receber 1 500,00 €", "Renovação"
  entity: string;
  detail?: string;
  contractId: string;
};

/** Todos os eventos entre `from` e `to` (inclusive) dos contratos a que o utilizador tem acesso. */
export async function getCalendarEvents(
  user: CurrentUser,
  from: Date,
  to: Date,
  categories: readonly EventCategory[],
): Promise<CalendarEvent[]> {
  const access = contractAccessWhere(user);
  const range = { gte: from, lte: to };
  const events: CalendarEvent[] = [];

  const [contracts, payments, dates] = await Promise.all([
    categories.includes("contratos")
      ? prisma.contract.findMany({
          where: { AND: [access, { OR: [{ startDate: range }, { endDate: range }] }] },
          select: { id: true, entity: true, type: true, startDate: true, endDate: true },
        })
      : [],
    categories.includes("pagamentos")
      ? prisma.payment.findMany({
          where: { date: range, contract: access },
          include: { contract: { select: { id: true, entity: true } } },
        })
      : [],
    categories.includes("datas")
      ? prisma.contractDate.findMany({
          where: { date: range, contract: access },
          include: { contract: { select: { id: true, entity: true } } },
        })
      : [],
  ]);

  for (const c of contracts) {
    if (c.startDate >= from && c.startDate <= to) {
      events.push({
        key: `ci-${c.id}`, iso: dateToISO(c.startDate), category: "contratos", tone: "contrato",
        label: "Início de contrato", entity: c.entity, detail: c.type, contractId: c.id,
      });
    }
    if (c.endDate >= from && c.endDate <= to) {
      events.push({
        key: `cf-${c.id}`, iso: dateToISO(c.endDate), category: "contratos", tone: "contrato",
        label: "Fim de contrato", entity: c.entity, detail: c.type, contractId: c.id,
      });
    }
  }

  for (const p of payments) {
    const receives = p.direction === "ENTIDADE_PARA_PARKALGAR";
    const amount = p.mode === "VALOR"
      ? formatEUR(p.amountCents ?? 0)
      : `${formatPercent(p.percentage ?? 0)} de ${p.percentageBase ?? ""}`;
    events.push({
      key: `p-${p.id}`, iso: dateToISO(p.date), category: "pagamentos", tone: receives ? "receber" : "pagar",
      label: `${receives ? "A receber" : "A pagar"} ${amount}`, entity: p.contract.entity, contractId: p.contract.id,
    });
  }

  for (const d of dates) {
    events.push({
      key: `d-${d.id}`, iso: dateToISO(d.date), category: "datas", tone: "data",
      label: dateKindName(d.kind, d.label), entity: d.contract.entity, detail: d.note ?? undefined,
      contractId: d.contract.id,
    });
  }

  const order: Record<EventCategory, number> = { contratos: 0, datas: 1, pagamentos: 2 };
  return events.sort(
    (a, b) => a.iso.localeCompare(b.iso) || order[a.category] - order[b.category] || a.entity.localeCompare(b.entity),
  );
}
