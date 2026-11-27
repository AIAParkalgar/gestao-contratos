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
