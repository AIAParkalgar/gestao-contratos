import Link from "next/link";
import { requireUser } from "@/lib/auth";
import {
  EVENT_CATEGORIES,
  EVENT_CATEGORY_LABELS,
  getCalendarEvents,
  type CalendarEvent,
  type EventCategory,
  type EventTone,
} from "@/lib/calendar";
import { dateToISO, isoToDate, todayISO } from "@/lib/format";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type View = "mes" | "lista";

const DAY_MS = 86_400_000;
const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const MAX_PER_DAY = 3;

const TONE_STYLES: Record<EventTone, string> = {
  contrato: "border-indigo-200 bg-indigo-50 text-indigo-800 hover:bg-indigo-100",
  receber: "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
  pagar: "border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100",
  data: "border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100",
};
const TONE_DOT: Record<EventTone, string> = {
  contrato: "bg-indigo-500",
  receber: "bg-emerald-500",
  pagar: "bg-rose-500",
  data: "bg-amber-500",
};
const LEGEND: { tone: EventTone; label: string }[] = [
  { tone: "contrato", label: "Início / fim de contrato" },
  { tone: "receber", label: "Pagamento a receber" },
  { tone: "pagar", label: "Pagamento a pagar" },
  { tone: "data", label: "Outra data relevante" },
];

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const monthName = (y: number, m: number) =>
  capitalize(new Intl.DateTimeFormat("pt-PT", { month: "long", year: "numeric", timeZone: "UTC" }).format(Date.UTC(y, m - 1, 1)));
const dayLabel = (iso: string) =>
  new Intl.DateTimeFormat("pt-PT", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: "UTC" }).format(isoToDate(iso));
const addMonths = (y: number, m: number, n: number) => {
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1 };
};
const ym = (y: number, m: number) => `${y}-${String(m).padStart(2, "0")}`;

export default async function CalendarPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");

  const view: View = str("vista") === "lista" ? "lista" : "mes";
  const today = todayISO();
  const [ty, tm] = today.split("-").map(Number);
  const monthMatch = /^(\d{4})-(\d{2})$/.exec(str("mes"));
  const y = monthMatch ? Number(monthMatch[1]) : ty;
  const m = monthMatch && Number(monthMatch[2]) >= 1 && Number(monthMatch[2]) <= 12 ? Number(monthMatch[2]) : tm;

  const requested = str("tipos").split(",").filter((t): t is EventCategory => (EVENT_CATEGORIES as readonly string[]).includes(t));
  const categories: EventCategory[] = requested.length ? requested : [...EVENT_CATEGORIES];

  const href = (o: { vista?: View; mes?: string; tipos?: EventCategory[] }) => {
    const params = new URLSearchParams();
    const v = o.vista ?? view;
    if (v === "lista") params.set("vista", "lista");
    const mes = o.mes ?? ym(y, m);
    if (v === "mes" && mes !== ym(ty, tm)) params.set("mes", mes);
    const t = o.tipos ?? categories;
    if (t.length < EVENT_CATEGORIES.length) params.set("tipos", t.join(","));
    const q = params.toString();
    return `/calendario${q ? `?${q}` : ""}`;
  };

  // Intervalo a consultar
  let from: Date, to: Date;
  const gridDays: string[] = [];
  if (view === "mes") {
    const first = new Date(Date.UTC(y, m - 1, 1));
    const last = new Date(Date.UTC(y, m, 0));
    from = new Date(first.getTime() - ((first.getUTCDay() + 6) % 7) * DAY_MS); // segunda-feira
    to = new Date(last.getTime() + (6 - ((last.getUTCDay() + 6) % 7)) * DAY_MS); // domingo
    for (let t = from.getTime(); t <= to.getTime(); t += DAY_MS) gridDays.push(dateToISO(new Date(t)));
  } else {
    from = isoToDate(today);
    to = new Date(Date.UTC(ty + 1, tm - 1, Number(today.slice(8, 10))));
  }

  const events = await getCalendarEvents(user, from, to, categories);
  const byDay = new Map<string, CalendarEvent[]>();
  for (const e of events) byDay.set(e.iso, [...(byDay.get(e.iso) ?? []), e]);

  const prev = addMonths(y, m, -1);
  const next = addMonths(y, m, 1);
  const monthPrefix = ym(y, m);
  const monthEvents = events.filter((e) => e.iso.startsWith(monthPrefix));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Calendário</h1>
          <p className="text-sm text-slate-500">Datas dos contratos a que tem acesso.</p>
        </div>
        <div className="inline-flex overflow-hidden rounded-md border border-slate-300 text-sm shadow-sm">
          <Link href={href({ vista: "mes" })} aria-current={view === "mes" ? "page" : undefined}
            className={`px-4 py-2 font-medium ${view === "mes" ? "bg-indigo-600 text-white" : "bg-white text-slate-700 hover:bg-slate-50"}`}>
            Mês
          </Link>
          <Link href={href({ vista: "lista" })} aria-current={view === "lista" ? "page" : undefined}
            className={`border-l border-slate-300 px-4 py-2 font-medium ${view === "lista" ? "bg-indigo-600 text-white" : "bg-white text-slate-700 hover:bg-slate-50"}`}>
            Lista
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-slate-500">Mostrar:</span>
        {EVENT_CATEGORIES.map((c) => {
          const active = categories.includes(c);
          const toggled = active ? categories.filter((x) => x !== c) : [...categories, c];
          return (
            <Link key={c} href={href({ tipos: toggled.length ? toggled : categories })} aria-pressed={active}
              className={`rounded-full border px-3 py-1 ${active ? "border-indigo-500 bg-indigo-50 text-indigo-800" : "border-slate-300 bg-white text-slate-500 line-through hover:bg-slate-50"}`}>
              {EVENT_CATEGORY_LABELS[c]}
            </Link>
          );
        })}
      </div>

      {view === "mes" ? (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
            <Link href={href({ mes: ym(prev.y, prev.m) })} className="btn btn-secondary px-3 py-1.5" aria-label="Mês anterior">←</Link>
            <div className="flex items-center gap-3">
              <h2 className="text-base font-semibold text-slate-900">{monthName(y, m)}</h2>
              {monthPrefix !== ym(ty, tm) && (
                <Link href={href({ mes: ym(ty, tm) })} className="text-sm text-indigo-700 hover:underline">Hoje</Link>
              )}
            </div>
            <Link href={href({ mes: ym(next.y, next.m) })} className="btn btn-secondary px-3 py-1.5" aria-label="Mês seguinte">→</Link>
          </div>

          {/* Grelha (ecrãs médios e grandes) */}
          <div className="hidden md:block">
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-medium text-slate-600">
              {WEEKDAYS.map((d) => <div key={d} className="py-2">{d}</div>)}
            </div>
            <div className="grid grid-cols-7">
              {gridDays.map((iso, i) => {
                const dayEvents = byDay.get(iso) ?? [];
                const inMonth = iso.startsWith(monthPrefix);
                const isToday = iso === today;
                return (
                  <div key={iso} data-day={iso}
                    className={`min-h-28 border-slate-100 p-1.5 ${i % 7 !== 6 ? "border-r" : ""} ${i < gridDays.length - 7 ? "border-b" : ""} ${inMonth ? "bg-white" : "bg-slate-50/70"}`}>
                    <div className="mb-1 flex justify-end">
                      <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${isToday ? "bg-indigo-600 font-semibold text-white" : inMonth ? "text-slate-700" : "text-slate-400"}`}>
                        {Number(iso.slice(8, 10))}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {dayEvents.slice(0, MAX_PER_DAY).map((e) => <EventPill key={e.key} event={e} />)}
                      {dayEvents.length > MAX_PER_DAY && (
                        <details className="text-xs">
                          <summary className="cursor-pointer px-1 text-slate-500 hover:text-slate-800">
                            +{dayEvents.length - MAX_PER_DAY} mais
                          </summary>
                          <div className="mt-1 space-y-1">
                            {dayEvents.slice(MAX_PER_DAY).map((e) => <EventPill key={e.key} event={e} />)}
                          </div>
                        </details>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Lista do mês (telemóvel) */}
          <div className="md:hidden">
            <EventList events={monthEvents} today={today} groupByMonth={false}
              empty="Sem datas neste mês." />
          </div>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-base font-semibold text-slate-900">Próximos 12 meses</h2>
          </div>
          <EventList events={events} today={today} groupByMonth empty="Sem datas nos próximos 12 meses." />
        </div>
      )}

      <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-600">
        {LEGEND.map((l) => (
          <span key={l.tone} className="inline-flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-full ${TONE_DOT[l.tone]}`} />
            {l.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function EventPill({ event }: { event: CalendarEvent }) {
  const title = `${event.label} — ${event.entity}${event.detail ? ` (${event.detail})` : ""}`;
  return (
    <Link href={`/contratos/${event.contractId}`} title={title}
      className={`block truncate rounded border px-1.5 py-0.5 text-xs leading-snug ${TONE_STYLES[event.tone]}`}>
      <span className="font-medium">{event.label}</span>
      <span className="opacity-80"> · {event.entity}</span>
    </Link>
  );
}

function EventList({
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
