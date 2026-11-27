import { z } from "zod";
import { DATE_KINDS, PAYMENT_DIRECTIONS, ROLES, VISIBILITIES } from "./constants";

const required = (msg = "campo obrigatório") => z.string().trim().min(1, msg);

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "data inválida")
  .refine((s) => !Number.isNaN(Date.parse(s)), "data inválida");

const paymentBase = {
  direction: z.enum(PAYMENT_DIRECTIONS, { errorMap: () => ({ message: "escolha quem paga" }) }),
  date: isoDate,
};

export const paymentSchema = z.discriminatedUnion(
  "mode",
  [
    z.object({
      ...paymentBase,
      mode: z.literal("VALOR"),
      amount: z.coerce
        .number({ invalid_type_error: "valor inválido" })
        .positive("deve ser maior que 0")
        .max(1_000_000_000, "valor demasiado elevado"),
    }),
    z.object({
      ...paymentBase,
      mode: z.literal("PERCENTAGEM"),
      percentage: z.coerce
        .number({ invalid_type_error: "percentagem inválida" })
        .gt(0, "deve ser maior que 0")
        .max(100, "não pode ser superior a 100"),
      percentageBase: required("indique sobre o que incide a percentagem"),
    }),
  ],
  { errorMap: () => ({ message: "escolha Valor ou Percentagem" }) },
);

export const contractDateSchema = z
  .object({
    kind: z.enum(DATE_KINDS, { errorMap: () => ({ message: "escolha o tipo de data" }) }),
    label: z.string().trim().max(120, "demasiado longo").optional().default(""),
    date: isoDate,
    note: z.string().trim().max(1000, "demasiado longa").optional().default(""),
  })
  .superRefine((d, ctx) => {
    if (d.kind === "OUTRA" && !d.label) {
      ctx.addIssue({ code: "custom", path: ["label"], message: "indique o nome da data" });
    }
  });

const isHttpUrl = (v: string) => {
  try {
    const u = new URL(v);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
};

export const documentSchema = z.object({
  name: required("indique o nome do documento").pipe(z.string().max(120, "demasiado longo")),
  url: z.string().trim().max(2000, "link demasiado longo").refine(isHttpUrl, "link inválido (deve começar por https://)"),
});

/** Texto opcional: "" → null. */
const optionalText = (max: number) =>
  z.string().trim().max(max, "demasiado longo").optional().transform((v) => (v ? v : null));

/** Inteiro opcional vindo de um campo de texto: "" → null. */
const optionalInt = (min: number, max: number, msg: string) =>
  z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => (v === undefined || v === "" ? null : Number(v)))
    .refine((v) => v === null || (Number.isInteger(v) && v >= min && v <= max), msg);

export const contractSchema = z
  .object({
    type: required(),
    entity: required(),
    entityNif: optionalText(30),
    contactName: optionalText(120),
    contactEmail: optionalText(200).refine(
      (v) => v === null || z.string().email().safeParse(v).success,
      "email inválido",
    ),
    contactPhone: optionalText(40),
    autoRenew: z.boolean().default(false),
    renewalMonths: optionalInt(1, 120, "entre 1 e 120 meses"),
    noticeDays: optionalInt(0, 3650, "entre 0 e 3650 dias"),
    responsibleId: z.string().optional().transform((v) => (v ? v : null)),
    startDate: isoDate,
    endDate: isoDate,
    scope: z
      .string()
      .trim()
      .max(5000, "demasiado longo")
      .optional()
      .transform((v) => (v ? v : null)),
    obligations: required(),
    documents: z.array(documentSchema).max(50).default([]),
    visibility: z.enum(VISIBILITIES, { errorMap: () => ({ message: "opção inválida" }) }),
    teamId: z
      .string()
      .optional()
      .transform((v) => (v ? v : null)),
    payments: z.array(paymentSchema).max(200),
    dates: z.array(contractDateSchema).max(100).default([]),
  })
  .superRefine((d, ctx) => {
    if (d.endDate < d.startDate) {
      ctx.addIssue({ code: "custom", path: ["endDate"], message: "não pode ser anterior à data de início" });
    }
    if (d.autoRenew && !d.renewalMonths) {
      ctx.addIssue({ code: "custom", path: ["renewalMonths"], message: "indique a duração de cada renovação" });
    }
    if (d.visibility === "RESTRITO" && !d.teamId) {
      ctx.addIssue({ code: "custom", path: ["teamId"], message: "obrigatória para contratos restritos" });
    }
  });

export type ContractInput = z.infer<typeof contractSchema>;

export const teamSchema = z.object({
  name: required().pipe(z.string().max(60, "máximo 60 caracteres")),
  memberIds: z.array(z.string()).max(1000),
});

export const userSchema = z.object({
  name: required(),
  email: z.string().trim().toLowerCase().email("email inválido"),
  password: z.string(),
  role: z.enum(ROLES),
  active: z.boolean(),
  teamIds: z.array(z.string()),
});

const FIELD_LABELS: Record<string, string> = {
  type: "Tipo",
  entity: "Entidade contratante",
  startDate: "Data de início",
  endDate: "Data de fim",
  scope: "Âmbito",
  entityNif: "NIF da entidade",
  contactName: "Pessoa de contacto",
  contactEmail: "Email de contacto",
  contactPhone: "Telefone de contacto",
  renewalMonths: "Renovação (meses)",
  noticeDays: "Aviso prévio (dias)",
  responsibleId: "Responsável",
  obligations: "Obrigações",
  visibility: "Visibilidade",
  teamId: "Equipa",
  name: "Nome",
  email: "Email",
  password: "Password",
  role: "Perfil",
  teamIds: "Equipas",
  memberIds: "Membros",
};

const PAYMENT_LABELS: Record<string, string> = {
  direction: "De / Para",
  date: "Data",
  mode: "Tipo",
  amount: "Valor",
  percentage: "Percentagem",
  percentageBase: "Percentagem de",
};

const DATE_LABELS: Record<string, string> = {
  kind: "Tipo",
  label: "Nome",
  date: "Data",
  note: "Nota",
};

export function formatZodErrors(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const [first, index, field] = issue.path;
    if (first === "documents" && typeof index === "number") {
      const label = field === "name" ? "Nome" : field === "url" ? "Link" : "";
      return `Documento ${index + 1}${label ? ` — ${label}` : ""}: ${issue.message}`;
    }
    if (first === "dates" && typeof index === "number") {
      const label = DATE_LABELS[String(field)] ?? "";
      return `Data relevante ${index + 1}${label ? ` — ${label}` : ""}: ${issue.message}`;
    }
    if (first === "payments" && typeof index === "number") {
      const label = PAYMENT_LABELS[String(field)] ?? "";
      return `Pagamento ${index + 1}${label ? ` — ${label}` : ""}: ${issue.message}`;
    }
    const label = FIELD_LABELS[String(first)];
    return label ? `${label}: ${issue.message}` : issue.message;
  });
}
