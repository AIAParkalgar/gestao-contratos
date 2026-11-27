import type { Prisma } from "@prisma/client";
import type { CurrentUser } from "./auth";

/**
 * Regras de acesso de leitura:
 * - Admin: vê tudo.
 * - Público: todos.
 * - Restrito: quem pertence à equipa do contrato (e quem o criou).
 * - Confidencial: apenas quem criou (e admins).
 */
export function contractAccessWhere(user: CurrentUser): Prisma.ContractWhereInput {
  if (user.role === "ADMIN") return {};
  return {
    OR: [
      { visibility: "PUBLICO" },
      { creatorId: user.id },
      { visibility: "RESTRITO", teamId: { in: user.teamIds } },
    ],
  };
}

/** Editar e apagar: apenas quem criou e admins. */
export function canEditContract(user: CurrentUser, contract: { creatorId: string }): boolean {
  return user.role === "ADMIN" || contract.creatorId === user.id;
}
