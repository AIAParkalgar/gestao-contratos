"use client";

import { useHydrated } from "@/lib/useHydrated";
import { useState, useTransition } from "react";
import Link from "next/link";
import { saveUser } from "@/app/(app)/admin/utilizadores/actions";
import ErrorBox from "./ErrorBox";
import { ROLES, ROLE_LABELS, type Role } from "@/lib/constants";

export type UserFormValues = {
  name: string;
  email: string;
  role: Role;
  active: boolean;
  teamIds: string[];
};

export default function UserForm({
  userId,
  initial,
  teams,
  isSelf,
}: {
  userId: string | null;
  initial: UserFormValues;
  teams: { id: string; name: string }[];
  isSelf: boolean;
}) {
  const [values, setValues] = useState(initial);
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const hydrated = useHydrated();

  const toggleTeam = (id: string) =>
    setValues((v) => ({
      ...v,
      teamIds: v.teamIds.includes(id) ? v.teamIds.filter((t) => t !== id) : [...v.teamIds, id],
    }));

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors([]);
    startTransition(async () => {
      const res = await saveUser(userId, { ...values, password });
      if (res?.errors) setErrors(res.errors);
    });
  }

  return (
    <form onSubmit={onSubmit} className="card max-w-2xl space-y-5 p-5">
      <ErrorBox errors={errors} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="name">Nome *</label>
          <input id="name" className="input" required value={values.name}
            onChange={(e) => setValues({ ...values, name: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="email">Email *</label>
          <input id="email" type="email" className="input" required value={values.email}
            onChange={(e) => setValues({ ...values, email: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="password">{userId ? "Nova password" : "Password *"}</label>
          <input id="password" type="password" autoComplete="new-password" className="input"
            required={!userId} minLength={8} value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder={userId ? "Deixe em branco para manter" : "Mínimo 8 caracteres"} />
        </div>
        <div>
          <label className="label" htmlFor="role">Perfil *</label>
          <select id="role" className="input" value={values.role} disabled={isSelf}
            onChange={(e) => setValues({ ...values, role: e.target.value as Role })}>
            {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
          {isSelf && <p className="mt-1 text-xs text-slate-500">Não pode alterar o seu próprio perfil.</p>}
        </div>
      </div>

      <fieldset>
        <legend className="label">Equipas</legend>
        <div className="flex flex-wrap gap-2">
          {teams.map((t) => {
            const checked = values.teamIds.includes(t.id);
            return (
              <label key={t.id}
                className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm ${checked ? "border-indigo-500 bg-indigo-50 text-indigo-800" : "border-slate-300 text-slate-700 hover:bg-slate-50"}`}>
                <input type="checkbox" checked={checked} onChange={() => toggleTeam(t.id)} className="accent-indigo-600" />
                {t.name}
              </label>
            );
          })}
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Um utilizador vê os contratos restritos das equipas a que pertence.{" "}
          <Link href="/admin/equipas" className="text-indigo-700 hover:underline">Gerir equipas</Link>
        </p>
      </fieldset>

      {userId && (
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={values.active} disabled={isSelf}
            onChange={(e) => setValues({ ...values, active: e.target.checked })} className="accent-indigo-600" />
          Conta ativa
          <span className="text-slate-500">— contas inativas não conseguem entrar</span>
        </label>
      )}

      <div className="flex justify-end gap-3">
        <Link href="/admin/utilizadores" className="btn btn-secondary">Cancelar</Link>
        <button type="submit" className="btn btn-primary" disabled={pending || !hydrated}>
          {pending ? "A guardar…" : userId ? "Guardar alterações" : "Criar utilizador"}
        </button>
      </div>
    </form>
  );
}
