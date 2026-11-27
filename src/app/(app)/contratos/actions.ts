"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { canEditContract, contractAccessWhere } from "@/lib/access";
import { contractFullInclude, contractSnapshot, diffSnapshots, logAudit } from "@/lib/audit";
import { isoToDate } from "@/lib/format";
import { contractSchema, formatZodErrors } from "@/lib/validation";

export type ActionResult = { errors: string[] } | undefined;

function revalidateContracts() {
  revalidatePath("/contratos");
  revalidatePath("/calendario");
  revalidatePath("/painel");
}

/**
 * Cria (contractId = null) ou atualiza um contrato.
 * `duplicatedFrom`: id do contrato que serviu de base, só para o histórico.
 */
export async function saveContract(
  contractId: string | null,
  input: unknown,
  duplicatedFrom?: string | null,
): Promise<ActionResult> {
  const user = await requireUser();

  const parsed = contractSchema.safeParse(input);
  if (!parsed.success) return { errors: formatZodErrors(parsed.error) };
  const d = parsed.data;

  const existing = contractId
    ? await prisma.contract.findUnique({ where: { id: contractId }, include: contractFullInclude })
    : null;
  if (contractId && (!existing || !canEditContract(user, existing))) {
    return { errors: ["Não tem permissão para editar este contrato."] };
  }

  if (d.teamId) {
    const team = await prisma.team.findUnique({ where: { id: d.teamId } });
    if (!team) return { errors: ["Equipa: a equipa selecionada não existe."] };
    const keepsCurrentTeam = existing?.teamId === d.teamId;
    if (user.role !== "ADMIN" && !user.teamIds.includes(d.teamId) && !keepsCurrentTeam) {
      return { errors: ["Equipa: só pode associar o contrato a uma equipa a que pertence."] };
    }
  }

  if (d.responsibleId && d.responsibleId !== existing?.responsibleId) {
    const responsible = await prisma.user.findUnique({ where: { id: d.responsibleId } });
    if (!responsible || !responsible.active) return { errors: ["Responsável: escolha um utilizador ativo."] };
  }

  const data = {
    type: d.type,
    entity: d.entity,
    entityNif: d.entityNif,
    contactName: d.contactName,
    contactEmail: d.contactEmail,
    contactPhone: d.contactPhone,
    startDate: isoToDate(d.startDate),
    endDate: isoToDate(d.endDate),
    autoRenew: d.autoRenew,
    renewalMonths: d.autoRenew ? d.renewalMonths : null,
    noticeDays: d.noticeDays,
    scope: d.scope,
    obligations: d.obligations,
    visibility: d.visibility,
    teamId: d.teamId,
    responsibleId: d.responsibleId,
  };
  const payments = d.payments.map((p, order) => ({
    order,
    direction: p.direction,
    date: isoToDate(p.date),
    mode: p.mode,
    amountCents: p.mode === "VALOR" ? Math.round(p.amount * 100) : null,
    percentage: p.mode === "PERCENTAGEM" ? p.percentage : null,
    percentageBase: p.mode === "PERCENTAGEM" ? p.percentageBase : null,
  }));
  const dates = d.dates.map((x, order) => ({
    order,
    kind: x.kind,
    label: x.kind === "OUTRA" ? x.label : null,
    date: isoToDate(x.date),
    note: x.note || null,
  }));
  const documents = d.documents.map((x, order) => ({ order, name: x.name, url: x.url }));
  const nested = { payments: { create: payments }, dates: { create: dates }, documents: { create: documents } };

  let id: string;
  if (contractId && existing) {
    await prisma.$transaction([
      prisma.payment.deleteMany({ where: { contractId } }),
      prisma.contractDate.deleteMany({ where: { contractId } }),
      prisma.contractDocument.deleteMany({ where: { contractId } }),
      prisma.contract.update({ where: { id: contractId }, data: { ...data, ...nested } }),
    ]);
    id = contractId;
    const after = await prisma.contract.findUniqueOrThrow({ where: { id }, include: contractFullInclude });
    const changes = diffSnapshots(contractSnapshot(existing), contractSnapshot(after));
    if (changes.length) await logAudit(user, { contractId: id, entity: after.entity, action: "ALTERADO", changes });
  } else {
    const created = await prisma.contract.create({ data: { ...data, creatorId: user.id, ...nested } });
    id = created.id;
    let note: string | undefined;
    if (duplicatedFrom) {
      const source = await prisma.contract.findFirst({
        where: { AND: [{ id: duplicatedFrom }, contractAccessWhere(user)] },
        select: { entity: true, type: true },
      });
      if (source) note = `Criado a partir de uma cópia de "${source.entity}" (${source.type})`;
    }
    await logAudit(user, { contractId: id, entity: created.entity, action: "CRIADO", note });
  }

  revalidateContracts();
  redirect(`/contratos/${id}`);
}

export async function deleteContract(contractId: string): Promise<ActionResult> {
  const user = await requireUser();
  const contract = await prisma.contract.findUnique({ where: { id: contractId }, include: contractFullInclude });
  if (!contract || !canEditContract(user, contract)) {
    return { errors: ["Não tem permissão para apagar este contrato."] };
  }
  const snapshot = contractSnapshot(contract);
  await prisma.contract.delete({ where: { id: contractId } });
  // Guarda o conteúdo do contrato apagado no histórico (campos preenchidos).
  await logAudit(user, {
    contractId,
    entity: contract.entity,
    action: "APAGADO",
    changes: Object.entries(snapshot)
      .filter(([, v]) => v.value)
      .map(([field, v]) => ({ field, label: v.label, before: v.value, after: "" })),
  });
  revalidateContracts();
  redirect("/contratos");
}
