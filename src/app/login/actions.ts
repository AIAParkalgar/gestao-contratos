"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createSession, destroySession } from "@/lib/auth";

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

// Usado quando o email não existe, para o tempo de resposta ser semelhante.
const DUMMY_HASH = bcrypt.hashSync("dummy-password", 10);

export async function login(input: { email: string; password: string }): Promise<{ error: string } | undefined> {
  const email = String(input?.email ?? "").trim().toLowerCase();
  const password = String(input?.password ?? "");
  if (!email || !password) return { error: "Indique o email e a password." };

  const since = new Date(Date.now() - LOCK_MINUTES * 60_000);
  const failed = await prisma.loginAttempt.count({ where: { email, createdAt: { gt: since } } });
  if (failed >= MAX_FAILED_ATTEMPTS) {
    return { error: `Demasiadas tentativas falhadas. Tente novamente dentro de ${LOCK_MINUTES} minutos.` };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid) {
    await prisma.loginAttempt.create({ data: { email } });
    return { error: "Email ou password incorretos." };
  }
  if (!user.active) return { error: "Esta conta está desativada. Contacte um administrador." };

  // Limpeza: tentativas deste email e registos/sessões antigos.
  await prisma.$transaction([
    prisma.loginAttempt.deleteMany({
      where: { OR: [{ email }, { createdAt: { lt: new Date(Date.now() - 86_400_000) } }] },
    }),
    prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } }),
  ]);
  await createSession(user.id);
  redirect("/painel");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
