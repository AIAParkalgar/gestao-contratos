import Link from "next/link";
import type { CalendarEvent, EventTone } from "@/lib/calendar";
import { isoToDate } from "@/lib/format";

export const TONE_STYLES: Record<EventTone, string> = {
  contrato: "border-indigo-200 bg-indigo-50 text-indigo-800 hover:bg-indigo-100",
  receber: "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
  pagar: "border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100",
  data: "border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100",
};
export const TONE_DOT: Record<EventTone, string> = {
  contrato: "bg-indigo-500",
  receber: "bg-emerald-500",
  pagar: "bg-rose-500",
  data: "bg-amber-500",
};
export const LEGEND: { tone: EventTone; label: string }[] = [
  { tone: "contrato", label: "Início, fim ou renovação" },
  { tone: "receber", label: "Pagamento a receber" },
  { tone: "pagar", label: "Pagamento a pagar" },
  { tone: "data", label: "Outra data ou limite de denúncia" },
];

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export const monthName = (y: number, m: number) =>
  capitalize(new Intl.DateTimeFormat("pt-PT", { month: "long", year: "numeric", timeZone: "UTC" }).format(Date.UTC(y, m - 1, 1)));
const dayLabel = (iso: string) =>
  new Intl.DateTimeFormat("pt-PT", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: "UTC" }).format(isoToDate(iso));

export default function EventList({
  events,
  today,
  groupByMonth,
  empty,
}: {
  events: CalendarEvent[];
  today: string;
  groupByMonth: boolean;
  empty: string;
}) {
  if (events.length === 0) return <p className="p-8 text-center text-sm text-slate-500">{empty}</p>;

  const groups: { key: string; title: string; items: CalendarEvent[] }[] = [];
  for (const e of events) {
    const key = groupByMonth ? e.iso.slice(0, 7) : "all";
    let g = groups.find((x) => x.key === key);
    if (!g) {
      const [gy, gm] = e.iso.split("-").map(Number);
      g = { key, title: groupByMonth ? monthName(gy, gm) : "", items: [] };
      groups.push(g);
    }
    g.items.push(e);
  }

  return (
    <div>
      {groups.map((g) => (
        <section key={g.key}>
          {g.title && (
            <h3 className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">{g.title}</h3>
          )}
          <ul className="divide-y divide-slate-100">
            {g.items.map((e) => (
              <li key={e.key}>
                <Link href={`/contratos/${e.contractId}`} className="flex items-start gap-3 px-4 py-2.5 text-sm hover:bg-slate-50">
                  <span className={`w-20 shrink-0 tabular-nums ${e.iso === today ? "font-semibold text-indigo-700" : "text-slate-500"}`}>
                    {dayLabel(e.iso)}
                  </span>
                  <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${TONE_DOT[e.tone]}`} />
                  <span className="min-w-0">
                    <span className="font-medium text-slate-900">{e.label}</span>
                    <span className="text-slate-600"> · {e.entity}</span>
                    {e.detail && <span className="block truncate text-xs text-slate-500">{e.detail}</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
