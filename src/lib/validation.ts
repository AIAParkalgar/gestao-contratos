import { z } from "zod";
import { ROLES, VISIBILITIES } from "./constants";

const required = (msg = "campo obrigatório") => z.string().trim().min(1, msg);

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "data inválida")
  .refine((s) => !Number.isNaN(Date.parse(s)), "data inválida");

const paymentBase = {
  fromParty: required(),
  toParty: required(),
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

export const contractSchema = z
  .object({
    type: required(),
    entity: required(),
    startDate: isoDate,
    endDate: isoDate,
    obligations: required(),
    visibility: z.enum(VISIBILITIES, { errorMap: () => ({ message: "opção inválida" }) }),
    teamId: z
      .string()
      .optional()
      .transform((v) => (v ? v : null)),
    payments: z.array(paymentSchema).max(200),
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
  visibility: "Visibilidade",
  teamId: "Equipa",
  name: "Nome",
  email: "Email",
  password: "Password",
  role: "Perfil",
  teamIds: "Equipas",
};

const PAYMENT_LABELS: Record<string, string> = {
  fromParty: "De",
  toParty: "Para",
  date: "Data",
  mode: "Tipo",
  amount: "Valor",
  percentage: "Percentagem",
  percentageBase: "Percentagem de",
};

export function formatZodErrors(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const [first, index, field] = issue.path;
    if (first === "payments" && typeof index === "number") {
      const label = PAYMENT_LABELS[String(field)] ?? "";
      return `Pagamento ${index + 1}${label ? ` — ${label}` : ""}: ${issue.message}`;
    }
    const label = FIELD_LABELS[String(first)];
    return label ? `${label}: ${issue.message}` : issue.message;
  });
}
