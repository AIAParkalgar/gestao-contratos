"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { formatZodErrors, teamSchema } from "@/lib/validation";
import { TO_CONFIDENTIAL } from "@/lib/constants";

export type ActionResult = { errors: string[] } | undefined;

function revalidateAll() {
  revalidatePath("/admin/equipas");
  revalidatePath("/admin/utilizadores");
  revalidatePath("/contratos");
  revalidatePath("/calendario");
}

export async function saveTeam(teamId: string | null, input: unknown): Promise<ActionResult> {
  await requireAdmin();

  const parsed = teamSchema.safeParse(input);
  if (!parsed.success) return { errors: formatZodErrors(parsed.error) };
  const { name } = parsed.data;
  const memberIds = [...new Set(parsed.data.memberIds)];

  const clash = await prisma.team.findFirst({
    where: { name: { equals: name, mode: "insensitive" }, ...(teamId ? { NOT: { id: teamId } } : {}) },
  });
  if (clash) return { errors: [`Nome: já existe uma equipa chamada "${clash.name}".`] };

  if ((await prisma.user.count({ where: { id: { in: memberIds } } })) !== memberIds.length) {
    return { errors: ["Membros: seleção inválida."] };
  }

  const users = memberIds.map((id) => ({ id }));
  try {
    if (teamId) {
      await prisma.team.update({ where: { id: teamId }, data: { name, users: { set: users } } });
    } else {
      await prisma.team.create({ data: { name, users: { connect: users } } });
    }
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { errors: ["Nome: já existe uma equipa com este nome."] };
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return { errors: ["Esta equipa já não existe."] };
    }
    throw e;
  }

  revalidateAll();
  redirect("/admin/equipas");
}

/**
 * Apaga uma equipa. Os contratos associados passam para `target`
 * (outra equipa) ou, com TO_CONFIDENTIAL, os restritos ficam confidenciais
 * e os restantes ficam sem equipa. Os membros são apenas retirados da equipa.
 */
export async function deleteTeam(teamId: string, target: string): Promise<ActionResult> {
  await requireAdmin();

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: { _count: { select: { contracts: true } } },
  });
  if (!team) return { errors: ["Esta equipa já não existe."] };

  const ops: Prisma.PrismaPromise<unknown>[] = [];
  if (team._count.contracts > 0) {
    if (target === TO_CONFIDENTIAL) {
      ops.push(
        prisma.contract.updateMany({
          where: { teamId, visibility: "RESTRITO" },
          data: { visibility: "CONFIDENCIAL", teamId: null },
        }),
        prisma.contract.updateMany({ where: { teamId }, data: { teamId: null } }),
      );
    } else {
      if (!target || target === teamId || !(await prisma.team.findUnique({ where: { id: target } }))) {
        return { errors: ["Escolha para onde passam os contratos desta equipa."] };
      }
      ops.push(prisma.contract.updateMany({ where: { teamId }, data: { teamId: target } }));
    }
  }
  // As ligações aos membros (tabela _UserTeams) são apagadas em cascata.
  ops.push(prisma.team.delete({ where: { id: teamId } }));
  await prisma.$transaction(ops);

  revalidateAll();
  redirect("/admin/equipas");
}
