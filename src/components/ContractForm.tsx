"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { saveContract } from "@/app/(app)/contratos/actions";
import ErrorBox from "./ErrorBox";
import { useHydrated } from "@/lib/useHydrated";
import {
  CONTRACT_TYPE_SUGGESTIONS,
  DATE_KINDS,
  DATE_KIND_LABELS,
  OUR_COMPANY,
  VISIBILITIES,
  VISIBILITY_HELP,
  VISIBILITY_LABELS,
  type DateKind,
  type PaymentDirection,
  type PaymentMode,
  type Visibility,
} from "@/lib/constants";

export type PaymentFormValue = {
  key: string;
  direction: PaymentDirection;
  date: string;
  mode: PaymentMode;
  amount: string;
  percentage: string;
  percentageBase: string;
};

export type DateFormValue = {
  key: string;
  kind: DateKind;
  label: string;
  date: string;
  note: string;
};

export type DocumentFormValue = { key: string; name: string; url: string };

export type ContractFormValues = {
  type: string;
  entity: string;
  entityNif: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  renewalMonths: string;
  noticeDays: string;
  scope: string;
  obligations: string;
  visibility: Visibility;
  teamId: string;
  responsibleId: string;
  documents: DocumentFormValue[];
  payments: PaymentFormValue[];
  dates: DateFormValue[];
};

let keySeq = 0;
export const newKey = () => `k${Date.now()}-${keySeq++}`;

/** dd/mm/aaaa da data `iso` menos `days` dias (pré-visualização da data limite de denúncia). */
function minusDays(iso: string, days: number): string {
  const d = new Date(Date.parse(`${iso}T00:00:00Z`) - days * 86_400_000);
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
}

function emptyPayment(): PaymentFormValue {
  return { key: newKey(), direction: "ENTIDADE_PARA_PARKALGAR", date: "", mode: "VALOR", amount: "", percentage: "", percentageBase: "" };
}

function emptyDate(): DateFormValue {
  return { key: newKey(), kind: "RENOVACAO", label: "", date: "", note: "" };
}

export default function ContractForm({
  contractId,
  initial,
  teams,
  users,
  cancelHref,
  duplicatedFrom,
}: {
  contractId: string | null;
  initial: ContractFormValues;
  teams: { id: string; name: string }[];
  users: { id: string; name: string }[];
  cancelHref: string;
  duplicatedFrom?: string | null;
}) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const hydrated = useHydrated();
  const topRef = useRef<HTMLDivElement>(null);

  const entityName = values.entity.trim() || "(Entidade contratante)";

  const set = <K extends keyof ContractFormValues>(k: K, v: ContractFormValues[K]) =>
    setValues((prev) => ({ ...prev, [k]: v }));

  const setPayment = (key: string, patch: Partial<PaymentFormValue>) =>
    setValues((prev) => ({
      ...prev,
      payments: prev.payments.map((p) => (p.key === key ? { ...p, ...patch } : p)),
    }));

  const setDocument = (key: string, patch: Partial<DocumentFormValue>) =>
    setValues((prev) => ({
      ...prev,
      documents: prev.documents.map((d) => (d.key === key ? { ...d, ...patch } : d)),
    }));

  const noticeDaysNum = Number(values.noticeDays);
  const noticePreview =
    values.endDate && values.noticeDays !== "" && Number.isInteger(noticeDaysNum) && noticeDaysNum > 0
      ? minusDays(values.endDate, noticeDaysNum)
      : null;

  const setDate = (key: string, patch: Partial<DateFormValue>) =>
    setValues((prev) => ({
      ...prev,
      dates: prev.dates.map((d) => (d.key === key ? { ...d, ...patch } : d)),
    }));

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors([]);
    const payload = {
      type: values.type,
      entity: values.entity,
      entityNif: values.entityNif,
      contactName: values.contactName,
      contactEmail: values.contactEmail,
      contactPhone: values.contactPhone,
      startDate: values.startDate,
      endDate: values.endDate,
      autoRenew: values.autoRenew,
      renewalMonths: values.autoRenew ? values.renewalMonths : "",
      noticeDays: values.noticeDays,
      scope: values.scope,
      obligations: values.obligations,
      visibility: values.visibility,
      teamId: values.teamId,
      responsibleId: values.responsibleId,
      documents: values.documents.map((d) => ({ name: d.name, url: d.url })),
      payments: values.payments.map((p) =>
        p.mode === "VALOR"
          ? { direction: p.direction, date: p.date, mode: p.mode, amount: p.amount }
          : { direction: p.direction, date: p.date, mode: p.mode, percentage: p.percentage, percentageBase: p.percentageBase },
      ),
      dates: values.dates.map((d) => ({ kind: d.kind, label: d.label, date: d.date, note: d.note })),
    };
    startTransition(async () => {
      const res = await saveContract(contractId, payload, duplicatedFrom ?? null);
      if (res?.errors) {
        setErrors(res.errors);
        topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div ref={topRef} className="scroll-mt-4">
        <ErrorBox errors={errors} />
      </div>

      <section className="card p-5">
        <h2 className="mb-4 text-base font-semibold text-slate-900">Dados do contrato</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="type">Tipo *</label>
            <input id="type" className="input" list="contract-types" required value={values.type}
              onChange={(e) => set("type", e.target.value)} placeholder="Ex.: Prestação de serviços" />
            <datalist id="contract-types">
              {CONTRACT_TYPE_SUGGESTIONS.map((t) => <option key={t} value={t} />)}
            </datalist>
          </div>
          <div>
            <label className="label" htmlFor="entity">Entidade contratante *</label>
            <input id="entity" className="input" required value={values.entity}
              onChange={(e) => set("entity", e.target.value)} placeholder="Nome da entidade" />
          </div>
          <div className="grid gap-4 sm:col-span-2 sm:grid-cols-4">
            <div>
              <label className="label" htmlFor="entityNif">NIF <span className="font-normal text-slate-400">(opcional)</span></label>
              <input id="entityNif" className="input" value={values.entityNif} maxLength={30}
                onChange={(e) => set("entityNif", e.target.value)} placeholder="Ex.: 500000000" />
            </div>
            <div>
              <label className="label" htmlFor="contactName">Pessoa de contacto</label>
              <input id="contactName" className="input" value={values.contactName} maxLength={120}
                onChange={(e) => set("contactName", e.target.value)} placeholder="Nome" />
            </div>
            <div>
              <label className="label" htmlFor="contactEmail">Email</label>
              <input id="contactEmail" type="email" className="input" value={values.contactEmail} maxLength={200}
                onChange={(e) => set("contactEmail", e.target.value)} placeholder="nome@entidade.pt" />
            </div>
            <div>
              <label className="label" htmlFor="contactPhone">Telefone</label>
              <input id="contactPhone" type="tel" className="input" value={values.contactPhone} maxLength={40}
                onChange={(e) => set("contactPhone", e.target.value)} placeholder="+351 …" />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="startDate">Data de início *</label>
            <input id="startDate" type="date" className="input" required value={values.startDate}
              onChange={(e) => set("startDate", e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="endDate">Data de fim *</label>
            <input id="endDate" type="date" className="input" required value={values.endDate}
              min={values.startDate || undefined} onChange={(e) => set("endDate", e.target.value)} />
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50/60 p-4 sm:col-span-2">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-800">
              <input id="autoRenew" type="checkbox" checked={values.autoRenew} className="accent-indigo-600"
                onChange={(e) => set("autoRenew", e.target.checked)} />
              Renova automaticamente no fim do período
            </label>
            <div className="mt-3 grid gap-4 sm:grid-cols-3">
              {values.autoRenew && (
                <div>
                  <label className="label" htmlFor="renewalMonths">Cada renovação dura (meses) *</label>
                  <input id="renewalMonths" type="number" min={1} max={120} step={1} className="input" required
                    value={values.renewalMonths} onChange={(e) => set("renewalMonths", e.target.value)} placeholder="Ex.: 12" />
                </div>
              )}
              <div>
                <label className="label" htmlFor="noticeDays">
                  Aviso prévio para denunciar (dias) <span className="font-normal text-slate-400">(opcional)</span>
                </label>
                <input id="noticeDays" type="number" min={0} max={3650} step={1} className="input"
                  value={values.noticeDays} onChange={(e) => set("noticeDays", e.target.value)} placeholder="Ex.: 60" />
              </div>
              <div className="flex items-end text-sm text-slate-600">
                {noticePreview ? (
                  <p>Data limite de denúncia: <strong className="text-slate-900">{noticePreview}</strong>
                    {values.autoRenew && <span className="block text-xs text-slate-500">e o mesmo prazo antes de cada renovação</span>}
                  </p>
                ) : (
                  <p className="text-xs text-slate-500">Indique o aviso prévio para calcular a data limite de denúncia.</p>
                )}
              </div>
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="scope">
              Âmbito (scope) <span className="font-normal text-slate-400">(opcional)</span>
            </label>
            <textarea id="scope" rows={3} className="input" value={values.scope}
              onChange={(e) => set("scope", e.target.value)}
              placeholder="Propósito do contrato: o que está a ser contratado e para quê…" />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="obligations">Obrigações *</label>
            <textarea id="obligations" rows={6} className="input" required value={values.obligations}
              onChange={(e) => set("obligations", e.target.value)}
              placeholder="Descreva as obrigações de cada parte…" />
          </div>
        </div>
      </section>

      <section className="card p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Documentos</h2>
            <p className="text-sm text-slate-500">Links para o contrato, aditamentos, adendas… (no SharePoint: Partilhar → Copiar ligação).</p>
          </div>
          <button type="button" className="btn btn-secondary"
            onClick={() => set("documents", [...values.documents, { key: newKey(), name: values.documents.length ? "" : "Contrato", url: "" }])}>
            + Adicionar documento
          </button>
        </div>
        {values.documents.length === 0 ? (
          <p className="rounded-md border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            Sem documentos associados.
          </p>
        ) : (
          <ol className="space-y-3">
            {values.documents.map((d, i) => (
              <li key={d.key} className="grid gap-3 rounded-md border border-slate-200 bg-slate-50/60 p-4 sm:grid-cols-[1fr_2fr_auto] sm:items-end" data-testid="document-row">
                <div>
                  <label className="label" htmlFor={`${d.key}-name`}>Nome *</label>
                  <input id={`${d.key}-name`} className="input" required maxLength={120} value={d.name}
                    onChange={(e) => setDocument(d.key, { name: e.target.value })} placeholder="Ex.: Aditamento n.º 1" />
                </div>
                <div>
                  <label className="label" htmlFor={`${d.key}-url`}>Link *</label>
                  <input id={`${d.key}-url`} type="url" className="input" required value={d.url}
                    onChange={(e) => setDocument(d.key, { url: e.target.value })} placeholder="https://….sharepoint.com/…" />
                </div>
                <button type="button" className="text-sm text-red-600 hover:underline sm:mb-2"
                  aria-label={`Remover documento ${i + 1}`}
                  onClick={() => set("documents", values.documents.filter((x) => x.key !== d.key))}>
                  Remover
                </button>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="card p-5">
        <h2 className="mb-4 text-base font-semibold text-slate-900">Acesso e responsável</h2>
        <fieldset>
          <legend className="label">Visibilidade *</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {VISIBILITIES.map((v) => (
              <label key={v}
                className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm ${values.visibility === v ? "border-indigo-500 bg-indigo-50/50 ring-1 ring-indigo-500" : "border-slate-300 hover:bg-slate-50"}`}>
                <input type="radio" name="visibility" value={v} checked={values.visibility === v}
                  onChange={() => set("visibility", v)} className="mt-1 accent-indigo-600" />
                <span>
                  <span className="block font-medium text-slate-900">{VISIBILITY_LABELS[v]}</span>
                  <span className="block text-slate-500">{VISIBILITY_HELP[v]}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="mt-4 max-w-sm">
          <label className="label" htmlFor="teamId">
            Equipa {values.visibility === "RESTRITO" ? "*" : <span className="font-normal text-slate-400">(opcional)</span>}
          </label>
          <select id="teamId" className="input" value={values.teamId}
            required={values.visibility === "RESTRITO"} onChange={(e) => set("teamId", e.target.value)}>
            <option value="">— Sem equipa —</option>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          {teams.length === 0 && (
            <p className="mt-1 text-xs text-amber-700">Não pertence a nenhuma equipa. Peça a um administrador para o associar.</p>
          )}
        </div>
        <div className="mt-4 max-w-sm">
          <label className="label" htmlFor="responsibleId">
            Responsável interno <span className="font-normal text-slate-400">(opcional)</span>
          </label>
          <select id="responsibleId" className="input" value={values.responsibleId}
            onChange={(e) => set("responsibleId", e.target.value)}>
            <option value="">— Sem responsável —</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <p className="mt-1 text-xs text-slate-500">Quem gere o contrato na {OUR_COMPANY}. Consegue sempre ver o contrato.</p>
        </div>
      </section>

      <section className="card p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-900">Calendário de pagamentos</h2>
          <button type="button" className="btn btn-secondary"
            onClick={() => set("payments", [...values.payments, emptyPayment()])}>
            + Adicionar pagamento
          </button>
        </div>

        {values.payments.length === 0 ? (
          <p className="rounded-md border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            Sem pagamentos definidos.
          </p>
        ) : (
          <ol className="space-y-3">
            {values.payments.map((p, i) => {
              const parkalgarPays = p.direction === "PARKALGAR_PARA_ENTIDADE";
              return (
                <li key={p.key} className="rounded-md border border-slate-200 bg-slate-50/60 p-4" data-testid="payment-row">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">
                      Pagamento {i + 1}
                      <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${parkalgarPays ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>
                        {parkalgarPays ? "A pagar" : "A receber"}
                      </span>
                    </span>
                    <button type="button" className="text-sm text-red-600 hover:underline"
                      onClick={() => set("payments", values.payments.filter((x) => x.key !== p.key))}>
                      Remover
                    </button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <label className="label" htmlFor={`${p.key}-from`}>De *</label>
                      <select id={`${p.key}-from`} className="input" value={p.direction}
                        onChange={(e) => setPayment(p.key, { direction: e.target.value as PaymentDirection })}>
                        <option value="PARKALGAR_PARA_ENTIDADE">{OUR_COMPANY}</option>
                        <option value="ENTIDADE_PARA_PARKALGAR">{entityName}</option>
                      </select>
                    </div>
                    <div>
                      <label className="label" htmlFor={`${p.key}-to`}>Para *</label>
                      <select id={`${p.key}-to`} className="input" value={p.direction}
                        onChange={(e) => setPayment(p.key, { direction: e.target.value as PaymentDirection })}>
                        <option value="ENTIDADE_PARA_PARKALGAR">{OUR_COMPANY}</option>
                        <option value="PARKALGAR_PARA_ENTIDADE">{entityName}</option>
                      </select>
                    </div>
                    <div>
                      <label className="label" htmlFor={`${p.key}-date`}>Data *</label>
                      <input id={`${p.key}-date`} type="date" className="input" required value={p.date}
                        onChange={(e) => setPayment(p.key, { date: e.target.value })} />
                    </div>
                    <div>
                      <span className="label">Montante em</span>
                      <div className="grid grid-cols-2 overflow-hidden rounded-md border border-slate-300 text-sm">
                        {(["VALOR", "PERCENTAGEM"] as const).map((m) => (
                          <button key={m} type="button" aria-pressed={p.mode === m}
                            onClick={() => setPayment(p.key, { mode: m })}
                            className={`px-2 py-2 font-medium ${p.mode === m ? "bg-indigo-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}>
                            {m === "VALOR" ? "Valor (€)" : "Percentagem"}
                          </button>
                        ))}
                      </div>
                    </div>
                    {p.mode === "VALOR" ? (
                      <div>
                        <label className="label" htmlFor={`${p.key}-amount`}>Valor (€) *</label>
                        <input id={`${p.key}-amount`} type="number" step="0.01" min="0.01" inputMode="decimal"
                          className="input" required value={p.amount}
                          onChange={(e) => setPayment(p.key, { amount: e.target.value })} placeholder="0,00" />
                      </div>
                    ) : (
                      <>
                        <div>
                          <label className="label" htmlFor={`${p.key}-pct`}>Percentagem (%) *</label>
                          <input id={`${p.key}-pct`} type="number" step="0.01" min="0.01" max="100" inputMode="decimal"
                            className="input" required value={p.percentage}
                            onChange={(e) => setPayment(p.key, { percentage: e.target.value })} placeholder="Ex.: 10" />
                        </div>
                        <div className="sm:col-span-2 lg:col-span-3">
                          <label className="label" htmlFor={`${p.key}-base`}>Percentagem de *</label>
                          <input id={`${p.key}-base`} className="input" required value={p.percentageBase}
                            onChange={(e) => setPayment(p.key, { percentageBase: e.target.value })}
                            placeholder="Ex.: receita líquida de bilheteira" />
                        </div>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <section className="card p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Outras datas relevantes</h2>
            <p className="text-sm text-slate-500">Renovações, rescisões antecipadas, prazos de aviso prévio, etc.</p>
          </div>
          <button type="button" className="btn btn-secondary"
            onClick={() => set("dates", [...values.dates, emptyDate()])}>
            + Adicionar data
          </button>
        </div>

        {values.dates.length === 0 ? (
          <p className="rounded-md border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            Sem outras datas registadas.
          </p>
        ) : (
          <ol className="space-y-3">
            {values.dates.map((d, i) => (
              <li key={d.key} className="rounded-md border border-slate-200 bg-slate-50/60 p-4" data-testid="date-row">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">Data {i + 1}</span>
                  <button type="button" className="text-sm text-red-600 hover:underline"
                    onClick={() => set("dates", values.dates.filter((x) => x.key !== d.key))}>
                    Remover
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className="label" htmlFor={`${d.key}-kind`}>Tipo *</label>
                    <select id={`${d.key}-kind`} className="input" value={d.kind}
                      onChange={(e) => setDate(d.key, { kind: e.target.value as DateKind })}>
                      {DATE_KINDS.map((k) => <option key={k} value={k}>{DATE_KIND_LABELS[k]}</option>)}
                    </select>
                  </div>
                  {d.kind === "OUTRA" && (
                    <div>
                      <label className="label" htmlFor={`${d.key}-label`}>Nome *</label>
                      <input id={`${d.key}-label`} className="input" required value={d.label}
                        onChange={(e) => setDate(d.key, { label: e.target.value })} placeholder="Ex.: Revisão de preços" />
                    </div>
                  )}
                  <div>
                    <label className="label" htmlFor={`${d.key}-date`}>Data *</label>
                    <input id={`${d.key}-date`} type="date" className="input" required value={d.date}
                      onChange={(e) => setDate(d.key, { date: e.target.value })} />
                  </div>
                  <div className={d.kind === "OUTRA" ? "sm:col-span-2 lg:col-span-1" : "sm:col-span-2"}>
                    <label className="label" htmlFor={`${d.key}-note`}>
                      Nota <span className="font-normal text-slate-400">(opcional)</span>
                    </label>
                    <input id={`${d.key}-note`} className="input" value={d.note}
                      onChange={(e) => setDate(d.key, { note: e.target.value })}
                      placeholder="Ex.: renovação automática por 1 ano" />
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <div className="flex justify-end gap-3">
        <Link href={cancelHref} className="btn btn-secondary">Cancelar</Link>
        <button type="submit" className="btn btn-primary" disabled={pending || !hydrated}>
          {pending ? "A guardar…" : contractId ? "Guardar alterações" : "Criar contrato"}
        </button>
      </div>
    </form>
  );
}
