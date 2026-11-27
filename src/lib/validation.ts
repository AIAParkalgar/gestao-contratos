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

const documentUrl = z
  .string()
  .trim()
  .max(2000, "link demasiado longo")
  .optional()
  .transform((v) => (v ? v : null))
  .refine((v) => {
    if (!v) return true;
    try {
      const u = new URL(v);
      return u.protocol === "https:" || u.protocol === "http:";
    } catch {
      return false;
    }
  }, "link inválido (deve começar por https://)");

export const contractSchema = z
  .object({
    type: required(),
    entity: required(),
    startDate: isoDate,
    endDate: isoDate,
    obligations: required(),
    documentUrl,
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
    if (d.visibility === "RESTRITO" && !d.teamId) {
      ctx.addIssue({ code: "custom", path: ["teamId"], message: "obrigatória para contratos restritos" });
    }
  });

export type ContractInput = z.infer<typeof contractSchema>;

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
  obligations: "Obrigações",
  documentUrl: "Link do documento",
  visibility: "Visibilidade",
  teamId: "Equipa",
  name: "Nome",
  email: "Email",
  password: "Password",
  role: "Perfil",
  teamIds: "Equipas",
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
