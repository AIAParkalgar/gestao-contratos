"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { canEditContract } from "@/lib/access";
import { isoToDate } from "@/lib/format";
import { contractSchema, formatZodErrors } from "@/lib/validation";

export type ActionResult = { errors: string[] } | undefined;

export async function saveContract(contractId: string | null, input: unknown): Promise<ActionResult> {
  const user = await requireUser();

  const parsed = contractSchema.safeParse(input);
  if (!parsed.success) return { errors: formatZodErrors(parsed.error) };
  const d = parsed.data;

  let existing: { creatorId: string; teamId: string | null } | null = null;
  if (contractId) {
    existing = await prisma.contract.findUnique({
      where: { id: contractId },
      select: { creatorId: true, teamId: true },
    });
    if (!existing || !canEditContract(user, existing)) {
      return { errors: ["Não tem permissão para editar este contrato."] };
    }
  }

  if (d.teamId) {
    const team = await prisma.team.findUnique({ where: { id: d.teamId } });
    if (!team) return { errors: ["Equipa: a equipa selecionada não existe."] };
    const keepsCurrentTeam = existing?.teamId === d.teamId;
    if (user.role !== "ADMIN" && !user.teamIds.includes(d.teamId) && !keepsCurrentTeam) {
      return { errors: ["Equipa: só pode associar o contrato a uma equipa a que pertence."] };
    }
  }

  const data = {
    type: d.type,
    entity: d.entity,
    startDate: isoToDate(d.startDate),
    endDate: isoToDate(d.endDate),
    obligations: d.obligations,
    visibility: d.visibility,
    teamId: d.teamId,
  };
  const payments = d.payments.map((p, order) => ({
    order,
    fromParty: p.fromParty,
    toParty: p.toParty,
    date: isoToDate(p.date),
    mode: p.mode,
    amountCents: p.mode === "VALOR" ? Math.round(p.amount * 100) : null,
    percentage: p.mode === "PERCENTAGEM" ? p.percentage : null,
    percentageBase: p.mode === "PERCENTAGEM" ? p.percentageBase : null,
  }));

  let id: string;
  if (contractId) {
    await prisma.$transaction([
      prisma.payment.deleteMany({ where: { contractId } }),
      prisma.contract.update({
        where: { id: contractId },
        data: { ...data, payments: { create: payments } },
      }),
    ]);
    id = contractId;
  } else {
    const created = await prisma.contract.create({
      data: { ...data, creatorId: user.id, payments: { create: payments } },
    });
    id = created.id;
  }

  revalidatePath("/contratos");
  redirect(`/contratos/${id}`);
}

export async function deleteContract(contractId: string): Promise<ActionResult> {
  const user = await requireUser();
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    select: { creatorId: true },
  });
  if (!contract || !canEditContract(user, contract)) {
    return { errors: ["Não tem permissão para apagar este contrato."] };
  }
  await prisma.contract.delete({ where: { id: contractId } });
  revalidatePath("/contratos");
  redirect("/contratos");
}
