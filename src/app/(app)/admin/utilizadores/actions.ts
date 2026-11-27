"use server";

import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { formatZodErrors, userSchema } from "@/lib/validation";

export type ActionResult = { errors: string[] } | undefined;

const MIN_PASSWORD = 8;

export async function saveUser(userId: string | null, input: unknown): Promise<ActionResult> {
  const admin = await requireAdmin();

  const parsed = userSchema.safeParse(input);
  if (!parsed.success) return { errors: formatZodErrors(parsed.error) };
  const d = parsed.data;

  const errors: string[] = [];
  if (!userId && d.password.length < MIN_PASSWORD) {
    errors.push(`Password: deve ter pelo menos ${MIN_PASSWORD} caracteres.`);
  }
  if (userId && d.password && d.password.length < MIN_PASSWORD) {
    errors.push(`Password: deve ter pelo menos ${MIN_PASSWORD} caracteres (ou deixe em branco para manter).`);
  }
  const isSelf = userId === admin.id;
  if (isSelf && d.role !== "ADMIN") errors.push("Perfil: não pode retirar a si próprio o perfil de administrador.");
  if (isSelf && !d.active) errors.push("Não pode desativar a sua própria conta.");

  const teamCount = await prisma.team.count({ where: { id: { in: d.teamIds } } });
  if (teamCount !== new Set(d.teamIds).size) errors.push("Equipas: seleção inválida.");
  if (errors.length) return { errors };

  const teams = { set: d.teamIds.map((id) => ({ id })) };
  const base = { name: d.name, email: d.email, role: d.role, active: d.active };

  try {
    if (userId) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          ...base,
          teams,
          ...(d.password ? { passwordHash: await bcrypt.hash(d.password, 10) } : {}),
        },
      });
      // Termina as sessões abertas se a conta foi desativada ou a password mudou.
      if (!isSelf && (!d.active || d.password)) {
        await prisma.session.deleteMany({ where: { userId } });
      }
    } else {
      await prisma.user.create({
        data: {
          ...base,
          passwordHash: await bcrypt.hash(d.password, 10),
          teams: { connect: d.teamIds.map((id) => ({ id })) },
        },
      });
    }
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { errors: ["Email: já existe um utilizador com este email."] };
    }
    throw e;
  }

  revalidatePath("/admin/utilizadores");
  redirect("/admin/utilizadores");
}
