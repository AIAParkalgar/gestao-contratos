import ExcelJS from "exceljs";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { contractFullInclude } from "@/lib/audit";
import { contractListWhere, readContractFilters } from "@/lib/contractFilters";
import { DIRECTION_LABELS, VISIBILITY_LABELS, dateKindName, paymentParties, type PaymentDirection, type Visibility } from "@/lib/constants";
import { contractStatus, todayISO } from "@/lib/format";
import { currentTermEnd, noticeDeadline } from "@/lib/terms";

export const runtime = "nodejs";

const DATE_FMT = "dd/mm/yyyy";
const EUR_FMT = '#,##0.00 "€"';

function styleSheet(ws: ExcelJS.Worksheet) {
  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F46E5" } };
  header.alignment = { vertical: "middle" };
  ws.views = [{ state: "frozen", ySplit: 1 }];
  if (ws.columnCount > 0) {
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: ws.columnCount } };
  }
}

/** Exportação para Excel da lista de contratos (com os mesmos filtros). Só administradores. */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Sessão inválida.", { status: 401 });
  if (user.role !== "ADMIN") return new Response("Apenas administradores podem exportar.", { status: 403 });

  const filters = readContractFilters(new URL(req.url).searchParams);
  const contracts = await prisma.contract.findMany({
    where: contractListWhere(user, filters),
    include: contractFullInclude,
    orderBy: [{ entity: "asc" }],
  });

  const wb = new ExcelJS.Workbook();
  wb.creator = "Gestão de Contratos";
  wb.created = new Date();

  const wsC = wb.addWorksheet("Contratos");
  wsC.columns = [
    { header: "Entidade", key: "entity", width: 30 },
    { header: "Tipo", key: "type", width: 24 },
    { header: "NIF", key: "nif", width: 14 },
    { header: "Pessoa de contacto", key: "contact", width: 22 },
    { header: "Email", key: "email", width: 26 },
    { header: "Telefone", key: "phone", width: 16 },
    { header: "Início", key: "start", width: 12, style: { numFmt: DATE_FMT } },
    { header: "Fim", key: "end", width: 12, style: { numFmt: DATE_FMT } },
    { header: "Renovação automática", key: "autoRenew", width: 12 },
    { header: "Renovação (meses)", key: "renewalMonths", width: 10 },
    { header: "Aviso prévio (dias)", key: "noticeDays", width: 10 },
    { header: "Fim do período atual", key: "termEnd", width: 14, style: { numFmt: DATE_FMT } },
    { header: "Limite de denúncia", key: "deadline", width: 14, style: { numFmt: DATE_FMT } },
    { header: "Estado", key: "status", width: 18 },
    { header: "Visibilidade", key: "visibility", width: 13 },
    { header: "Equipa", key: "team", width: 16 },
    { header: "Responsável", key: "responsible", width: 20 },
    { header: "Criado por", key: "creator", width: 20 },
    { header: "Âmbito", key: "scope", width: 40 },
    { header: "Obrigações", key: "obligations", width: 50 },
    { header: "Total a receber (€)", key: "totalIn", width: 16, style: { numFmt: EUR_FMT } },
    { header: "Total a pagar (€)", key: "totalOut", width: 16, style: { numFmt: EUR_FMT } },
    { header: "Documentos", key: "documents", width: 50 },
  ];

  const wsP = wb.addWorksheet("Pagamentos");
  wsP.columns = [
    { header: "Entidade", key: "entity", width: 30 },
    { header: "Data", key: "date", width: 12, style: { numFmt: DATE_FMT } },
    { header: "De", key: "from", width: 26 },
    { header: "Para", key: "to", width: 26 },
    { header: "Sentido", key: "direction", width: 12 },
    { header: "Valor (€)", key: "amount", width: 14, style: { numFmt: EUR_FMT } },
    { header: "Percentagem (%)", key: "pct", width: 14 },
    { header: "Percentagem de", key: "base", width: 34 },
  ];

  const wsD = wb.addWorksheet("Outras datas");
  wsD.columns = [
    { header: "Entidade", key: "entity", width: 30 },
    { header: "Data", key: "date", width: 12, style: { numFmt: DATE_FMT } },
    { header: "Tipo", key: "kind", width: 26 },
    { header: "Nota", key: "note", width: 50 },
  ];

  for (const c of contracts) {
    const term = currentTermEnd(c);
    const sum = (dir: string) => c.payments.filter((p) => p.direction === dir).reduce((s, p) => s + (p.amountCents ?? 0), 0) / 100;
    wsC.addRow({
      entity: c.entity,
      type: c.type,
      nif: c.entityNif ?? "",
      contact: c.contactName ?? "",
      email: c.contactEmail ?? "",
      phone: c.contactPhone ?? "",
      start: c.startDate,
      end: c.endDate,
      autoRenew: c.autoRenew ? "Sim" : "Não",
      renewalMonths: c.renewalMonths ?? null,
      noticeDays: c.noticeDays ?? null,
      termEnd: term.end,
      deadline: noticeDeadline(term.end, c.noticeDays),
      status: contractStatus(c.startDate, term.end, c.autoRenew).label,
      visibility: VISIBILITY_LABELS[c.visibility as Visibility] ?? c.visibility,
      team: c.team?.name ?? "",
      responsible: c.responsible?.name ?? "",
      creator: c.creator.name,
      scope: c.scope ?? "",
      obligations: c.obligations,
      totalIn: sum("ENTIDADE_PARA_PARKALGAR"),
      totalOut: sum("PARKALGAR_PARA_ENTIDADE"),
      documents: c.documents.map((d) => `${d.name}: ${d.url}`).join("\n"),
    });
    for (const p of c.payments) {
      const parties = paymentParties(p.direction, c.entity);
      wsP.addRow({
        entity: c.entity,
        date: p.date,
        from: parties.from,
        to: parties.to,
        direction: DIRECTION_LABELS[p.direction as PaymentDirection] ?? p.direction,
        amount: p.mode === "VALOR" ? (p.amountCents ?? 0) / 100 : null,
        pct: p.mode === "PERCENTAGEM" ? p.percentage : null,
        base: p.mode === "PERCENTAGEM" ? p.percentageBase : "",
      });
    }
    for (const d of c.dates) {
      wsD.addRow({ entity: c.entity, date: d.date, kind: dateKindName(d.kind, d.label), note: d.note ?? "" });
    }
  }

  for (const ws of [wsC, wsP, wsD]) styleSheet(ws);
  wsC.getColumn("obligations").alignment = { wrapText: true, vertical: "top" };
  wsC.getColumn("documents").alignment = { wrapText: true, vertical: "top" };

  const buffer = await wb.xlsx.writeBuffer();
  return new Response(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="contratos-${todayISO()}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
