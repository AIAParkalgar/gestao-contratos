import { isoToDate, todayISO } from "./format";

const DAY_MS = 86_400_000;
const MAX_TERMS = 600;

type RenewalInfo = { endDate: Date; autoRenew: boolean; renewalMonths: number | null };

/** Soma meses a uma data (UTC), ajustando ao último dia do mês quando necessário (31/01 + 1 mês = 28/02). */
export function addMonthsUTC(d: Date, months: number): Date {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + months;
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(d.getUTCDate(), lastDay)));
}

export function subtractDays(d: Date, days: number): Date {
  return new Date(d.getTime() - days * DAY_MS);
}

const renews = (c: RenewalInfo) => c.autoRenew && !!c.renewalMonths && c.renewalMonths > 0;

/** Fim do k-ésimo período (k = 0 é o período inicial). */
export function termEnd(c: RenewalInfo, k: number): Date {
  return k === 0 || !renews(c) ? c.endDate : addMonthsUTC(c.endDate, k * c.renewalMonths!);
}

/**
 * Fim do período em curso. Sem renovação automática é a data de fim.
 * Com renovação, avança período a período até chegar a hoje ou ao futuro.
 */
export function currentTermEnd(c: RenewalInfo, today: Date = isoToDate(todayISO())): { end: Date; renewals: number } {
  if (!renews(c) || c.endDate >= today) return { end: c.endDate, renewals: 0 };
  let k = 0;
  while (termEnd(c, k) < today && k < MAX_TERMS) k++;
  return { end: termEnd(c, k), renewals: k };
}

/** Data limite para denunciar (evitar) a renovação do período que termina em `end`. */
export function noticeDeadline(end: Date, noticeDays: number | null): Date | null {
  return noticeDays && noticeDays > 0 ? subtractDays(end, noticeDays) : null;
}

/** Fins de período (k ≥ 0) entre `from` e `to`. */
export function termEndsBetween(c: RenewalInfo, from: Date, to: Date): Date[] {
  const out: Date[] = [];
  for (let k = 0; k < MAX_TERMS; k++) {
    const end = termEnd(c, k);
    if (end > to) break;
    if (end >= from) out.push(end);
    if (!renews(c)) break;
  }
  return out;
}
