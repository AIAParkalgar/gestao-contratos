import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { contractAccessWhere } from "@/lib/access";
import { EVENT_CATEGORIES, getCalendarEvents } from "@/lib/calendar";
import { contractStatus, formatDate, formatEUR, isoToDate, todayISO } from "@/lib/format";
import { currentTermEnd, noticeDeadline } from "@/lib/terms";
import { StatusBadge } from "@/components/Badges";
import EventList from "@/components/EventList";

const DAY_MS = 86_400_000;

export default async function DashboardPage() {
  const user = await requireUser();
  const today = todayISO();
  const todayDate = isoToDate(today);
  const in30 = new Date(todayDate.getTime() + 30 * DAY_MS);
  const in60 = new Date(todayDate.getTime() + 60 * DAY_MS);
  const access = contractAccessWhere(user);

  const [contracts, upcoming, payments] = await Promise.all([
    prisma.contract.findMany({
      where: access,
      select: {
        id: true, entity: true, type: true, startDate: true, endDate: true,
        autoRenew: true, renewalMonths: true, noticeDays: true, responsibleId: true,
      },
    }),
    getCalendarEvents(user, todayDate, in30, EVENT_CATEGORIES),
    prisma.payment.findMany({
      where: { date: { gte: todayDate, lte: in30 }, mode: "VALOR", contract: access },
      select: { direction: true, amountCents: true },
    }),
  ]);

  const withTerm = contracts.map((c) => {
    const term = currentTermEnd(c);
    return { ...c, termEnd: term.end, deadline: noticeDeadline(term.end, c.noticeDays) };
  });
  const active = withTerm.filter((c) => c.startDate <= todayDate && c.termEnd >= todayDate);
  const endingSoon = withTerm
    .filter((c) => c.startDate <= in60 && c.termEnd >= todayDate && c.termEnd <= in60)
    .sort((a, b) => a.termEnd.getTime() - b.termEnd.getTime());
  const deadlinesSoon = withTerm.filter((c) => c.deadline && c.deadline >= todayDate && c.deadline <= in60);
  const mine = withTerm
    .filter((c) => c.responsibleId === user.id && c.termEnd >= todayDate)
    .sort((a, b) => a.termEnd.getTime() - b.termEnd.getTime());
  const toReceive = payments.filter((p) => p.direction === "ENTIDADE_PARA_PARKALGAR").reduce((s, p) => s + (p.amountCents ?? 0), 0);
  const toPay = payments.filter((p) => p.direction === "PARKALGAR_PARA_ENTIDADE").reduce((s, p) => s + (p.amountCents ?? 0), 0);

  const firstName = user.name.split(" ")[0];
  const longDate = new Intl.DateTimeFormat("pt-PT", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(todayDate);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Olá, {firstName}</h1>
          <p className="text-sm text-slate-500 first-letter:uppercase">{longDate}</p>
        </div>
        <Link href="/contratos/novo" className="btn btn-primary">+ Novo contrato</Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Contratos ativos" value={String(active.length)} href="/contratos?estado=ativo" />
        <Stat label="Terminam ou renovam em 60 dias" value={String(endingSoon.length)} tone={endingSoon.length ? "warn" : undefined} />
        <Stat label="Limites de denúncia em 60 dias" value={String(deadlinesSoon.length)} tone={deadlinesSoon.length ? "warn" : undefined} />
        <div className="card p-4">
          <p className="text-sm text-slate-500">Pagamentos nos próximos 30 dias</p>
          <p className="mt-1 text-lg font-semibold text-emerald-700 tabular-nums">+{formatEUR(toReceive)}</p>
          <p className="text-lg font-semibold text-rose-700 tabular-nums">−{formatEUR(toPay)}</p>
          <p className="text-xs text-slate-400">valores fixos; não inclui percentagens</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <h2 className="text-base font-semibold text-slate-900">Próximos 30 dias</h2>
            <Link href="/calendario" className="text-sm text-indigo-700 hover:underline">Calendário →</Link>
          </div>
          <EventList events={upcoming} today={today} groupByMonth={false} empty="Nada agendado para os próximos 30 dias." />
        </section>

        <div className="space-y-6">
          <section className="card overflow-hidden">
            <h2 className="border-b border-slate-200 px-4 py-3 text-base font-semibold text-slate-900">
              Terminam ou renovam nos próximos 60 dias
            </h2>
            {endingSoon.length === 0 ? (
              <p className="p-6 text-center text-sm text-slate-500">Nenhum contrato.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {endingSoon.map((c) => (
                  <li key={c.id}>
                    <Link href={`/contratos/${c.id}`} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-slate-50">
                      <span className="min-w-0">
                        <span className="font-medium text-slate-900">{c.entity}</span>
                        <span className="block text-xs text-slate-500">
                          {c.autoRenew ? "Renova" : "Termina"} a {formatDate(c.termEnd)}
                          {c.deadline && c.deadline >= todayDate && ` · denunciar até ${formatDate(c.deadline)}`}
                        </span>
                      </span>
                      <StatusBadge status={contractStatus(c.startDate, c.termEnd, c.autoRenew)} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h2 className="text-base font-semibold text-slate-900">Sou responsável</h2>
              {mine.length > 0 && <Link href="/contratos?resp=1" className="text-sm text-indigo-700 hover:underline">Ver todos →</Link>}
            </div>
            {mine.length === 0 ? (
              <p className="p-6 text-center text-sm text-slate-500">Não é responsável por nenhum contrato em curso.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {mine.slice(0, 8).map((c) => (
                  <li key={c.id}>
                    <Link href={`/contratos/${c.id}`} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-slate-50">
                      <span className="min-w-0">
                        <span className="font-medium text-slate-900">{c.entity}</span>
                        <span className="block text-xs text-slate-500">{c.type}</span>
                      </span>
                      <StatusBadge status={contractStatus(c.startDate, c.termEnd, c.autoRenew)} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, href, tone }: { label: string; value: string; href?: string; tone?: "warn" }) {
  const body = (
    <>
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-3xl font-semibold tabular-nums ${tone === "warn" ? "text-orange-600" : "text-slate-900"}`}>{value}</p>
    </>
  );
  return href ? (
    <Link href={href} className="card block p-4 hover:border-indigo-300">{body}</Link>
  ) : (
    <div className="card p-4">{body}</div>
  );
}
