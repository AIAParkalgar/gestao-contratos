export const ROLES = ["USER", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];
export const ROLE_LABELS: Record<Role, string> = {
  USER: "Utilizador",
  ADMIN: "Administrador",
};

export const VISIBILITIES = ["PUBLICO", "RESTRITO", "CONFIDENCIAL"] as const;
export type Visibility = (typeof VISIBILITIES)[number];
export const VISIBILITY_LABELS: Record<Visibility, string> = {
  PUBLICO: "Público",
  RESTRITO: "Restrito",
  CONFIDENCIAL: "Confidencial",
};
export const VISIBILITY_HELP: Record<Visibility, string> = {
  PUBLICO: "Acessível a todos os utilizadores.",
  RESTRITO: "Acessível apenas à equipa selecionada.",
  CONFIDENCIAL: "Acessível apenas a quem criou e aos administradores.",
};

export const PAYMENT_MODES = ["VALOR", "PERCENTAGEM"] as const;
export type PaymentMode = (typeof PAYMENT_MODES)[number];

export const DEFAULT_TEAMS = ["Comercial", "Comunicação", "Operações"];

export const CONTRACT_TYPE_SUGGESTIONS = [
  "Prestação de serviços",
  "Fornecimento",
  "Patrocínio",
  "Parceria",
  "Licenciamento",
  "Arrendamento",
  "Acordo de confidencialidade (NDA)",
];

/** A empresa que usa a plataforma: os pagamentos são sempre entre ela e a entidade contratante. */
export const OUR_COMPANY = "Parkalgar";

export const PAYMENT_DIRECTIONS = ["ENTIDADE_PARA_PARKALGAR", "PARKALGAR_PARA_ENTIDADE"] as const;
export type PaymentDirection = (typeof PAYMENT_DIRECTIONS)[number];

/** Nome da parte que paga (De) e da que recebe (Para). */
export function paymentParties(direction: string, entity: string): { from: string; to: string } {
  const other = entity.trim() || "(Entidade contratante)";
  return direction === "PARKALGAR_PARA_ENTIDADE"
    ? { from: OUR_COMPANY, to: other }
    : { from: other, to: OUR_COMPANY };
}

/** Do ponto de vista da Parkalgar. */
export const DIRECTION_LABELS: Record<PaymentDirection, string> = {
  ENTIDADE_PARA_PARKALGAR: "A receber",
  PARKALGAR_PARA_ENTIDADE: "A pagar",
};

export const DATE_KINDS = ["RENOVACAO", "RESCISAO_ANTECIPADA", "AVISO_PREVIO", "OUTRA"] as const;
export type DateKind = (typeof DATE_KINDS)[number];
export const DATE_KIND_LABELS: Record<DateKind, string> = {
  RENOVACAO: "Renovação",
  RESCISAO_ANTECIPADA: "Rescisão antecipada",
  AVISO_PREVIO: "Prazo de aviso prévio",
  OUTRA: "Outra",
};

/** Nome a mostrar para uma data relevante (o texto livre quando é "Outra"). */
export function dateKindName(kind: string, label?: string | null): string {
  if (kind === "OUTRA") return label?.trim() || DATE_KIND_LABELS.OUTRA;
  return DATE_KIND_LABELS[kind as DateKind] ?? kind;
}
