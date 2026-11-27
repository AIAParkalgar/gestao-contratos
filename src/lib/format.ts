const TZ = "Europe/Lisbon";
const DAY_MS = 86_400_000;

/** Data de hoje (fuso de Lisboa) no formato AAAA-MM-DD. */
export function todayISO(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** As datas são guardadas como meia-noite UTC do dia indicado. */
export function isoToDate(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

export function dateToISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("pt-PT", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

export function formatEUR(cents: number): string {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(cents / 100);
}

export function formatPercent(p: number): string {
  return `${new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 2 }).format(p)} %`;
}

export type ContractStatus = {
  key: "FUTURO" | "ATIVO" | "A_TERMINAR" | "TERMINADO";
  label: string;
};

/** `end` deve ser o fim do período em curso (ver currentTermEnd em terms.ts). */
export function contractStatus(start: Date, end: Date, autoRenew = false): ContractStatus {
  const today = isoToDate(todayISO()).getTime();
  if (start.getTime() > today) return { key: "FUTURO", label: "Por iniciar" };
  if (end.getTime() < today) return { key: "TERMINADO", label: "Terminado" };
  const days = Math.round((end.getTime() - today) / DAY_MS);
  if (days <= 30) {
    const verb = autoRenew ? "Renova" : "Termina";
    return {
      key: "A_TERMINAR",
      label: days === 0 ? `${verb} hoje` : `${verb} em ${days} dia${days === 1 ? "" : "s"}`,
    };
  }
  return { key: "ATIVO", label: "Ativo" };
}
