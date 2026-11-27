"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { createSession, requireUser } from "@/lib/auth";

export async function changePassword(input: {
  current: string;
  next: string;
  confirm: string;
}): Promise<{ errors?: string[]; ok?: boolean }> {
  const user = await requireUser();
  const current = String(input?.current ?? "");
  const next = String(input?.next ?? "");
  const confirm = String(input?.confirm ?? "");

  if (next.length < 8) return { errors: ["A nova password deve ter pelo menos 8 caracteres."] };
  if (next !== confirm) return { errors: ["A confirmação não coincide com a nova password."] };

  const record = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!(await bcrypt.compare(current, record.passwordHash))) {
    return { errors: ["A password atual está incorreta."] };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(next, 10) },
  });
  // Termina todas as sessões (incluindo noutros dispositivos) e abre uma nova aqui.
  await prisma.session.deleteMany({ where: { userId: user.id } });
  await createSession(user.id);
  return { ok: true };
}
