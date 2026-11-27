import type { Prisma } from "@prisma/client";
import type { CurrentUser } from "./auth";
import { contractAccessWhere } from "./access";
import { VISIBILITIES } from "./constants";
import { isoToDate, todayISO } from "./format";

export type ContractFilterValues = {
  q: string;
  visibilidade: string;
  equipa: string;
  estado: string;
  meus: boolean;
  resp: boolean;
};

type Params = Record<string, string | string[] | undefined> | URLSearchParams;

export function readContractFilters(sp: Params): ContractFilterValues {
  const get = (k: string) => {
    const v = sp instanceof URLSearchParams ? sp.get(k) : sp[k];
    return typeof v === "string" ? v.trim() : "";
  };
  return {
    q: get("q"),
    visibilidade: get("visibilidade"),
    equipa: get("equipa"),
    estado: get("estado"),
    meus: get("meus") === "1",
    resp: get("resp") === "1",
  };
}

/** Condição Prisma: regras de acesso + filtros da lista. */
export function contractListWhere(user: CurrentUser, f: ContractFilterValues): Prisma.ContractWhereInput {
  const today = isoToDate(todayISO());
  const and: Prisma.ContractWhereInput[] = [contractAccessWhere(user)];
  if (f.q) {
    and.push({
      OR: ["entity", "type", "scope", "obligations", "entityNif", "contactName"].map((field) => ({
        [field]: { contains: f.q, mode: "insensitive" },
      })),
    });
  }
  if ((VISIBILITIES as readonly string[]).includes(f.visibilidade)) and.push({ visibility: f.visibilidade });
  if (f.equipa) and.push({ teamId: f.equipa });
  if (f.meus) and.push({ creatorId: user.id });
  if (f.resp) and.push({ responsibleId: user.id });
  // Contratos com renovação automática continuam ativos depois da data de fim.
  if (f.estado === "ativo") and.push({ startDate: { lte: today }, OR: [{ endDate: { gte: today } }, { autoRenew: true }] });
  if (f.estado === "futuro") and.push({ startDate: { gt: today } });
  if (f.estado === "terminado") and.push({ endDate: { lt: today }, autoRenew: false });
  return { AND: and };
}

export function hasActiveFilters(f: ContractFilterValues): boolean {
  return Boolean(f.q || f.visibilidade || f.equipa || f.estado || f.meus || f.resp);
}
