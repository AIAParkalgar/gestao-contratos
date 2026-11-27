"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { saveTeam } from "@/app/(app)/admin/equipas/actions";
import ErrorBox from "./ErrorBox";
import { useHydrated } from "@/lib/useHydrated";

type UserOption = { id: string; name: string; email: string; active: boolean };

export default function TeamForm({
  teamId,
  initialName,
  initialMemberIds,
  users,
}: {
  teamId: string | null;
  initialName: string;
  initialMemberIds: string[];
  users: UserOption[];
}) {
  const [name, setName] = useState(initialName);
  const [memberIds, setMemberIds] = useState<string[]>(initialMemberIds);
  const [filter, setFilter] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const hydrated = useHydrated();

  const toggle = (id: string) =>
    setMemberIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const q = filter.trim().toLowerCase();
  const visible = q ? users.filter((u) => `${u.name} ${u.email}`.toLowerCase().includes(q)) : users;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors([]);
    startTransition(async () => {
      const res = await saveTeam(teamId, { name, memberIds });
      if (res?.errors) setErrors(res.errors);
    });
  }

  return (
    <form onSubmit={onSubmit} className="card max-w-2xl space-y-5 p-5">
      <ErrorBox errors={errors} />
      <div className="max-w-sm">
        <label className="label" htmlFor="name">Nome da equipa *</label>
        <input id="name" className="input" required maxLength={60} value={name}
          onChange={(e) => setName(e.target.value)} placeholder="Ex.: Jurídico" />
      </div>

      <fieldset>
        <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
          <legend className="label mb-0">
            Membros <span className="font-normal text-slate-500">({memberIds.length} selecionado{memberIds.length === 1 ? "" : "s"})</span>
          </legend>
          {users.length > 8 && (
            <input type="search" className="input max-w-xs py-1.5" placeholder="Procurar pessoa…"
              aria-label="Procurar pessoa" value={filter} onChange={(e) => setFilter(e.target.value)} />
          )}
        </div>
        {users.length === 0 ? (
          <p className="text-sm text-slate-500">Ainda não existem utilizadores.</p>
        ) : (
          <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto rounded-md border border-slate-200">
            {visible.map((u) => (
              <li key={u.id}>
                <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-slate-50">
                  <input type="checkbox" checked={memberIds.includes(u.id)} onChange={() => toggle(u.id)}
                    className="accent-indigo-600" />
                  <span className="min-w-0">
                    <span className={`font-medium ${u.active ? "text-slate-900" : "text-slate-400"}`}>{u.name}</span>
                    {!u.active && <span className="ml-1 text-xs text-slate-400">(inativo)</span>}
                    <span className="block truncate text-xs text-slate-500">{u.email}</span>
                  </span>
                </label>
              </li>
            ))}
            {visible.length === 0 && <li className="px-3 py-2 text-sm text-slate-500">Ninguém corresponde à pesquisa.</li>}
          </ul>
        )}
        <p className="mt-1 text-xs text-slate-500">Os membros veem os contratos restritos a esta equipa.</p>
      </fieldset>

      <div className="flex justify-end gap-3">
        <Link href="/admin/equipas" className="btn btn-secondary">Cancelar</Link>
        <button type="submit" className="btn btn-primary" disabled={pending || !hydrated}>
          {pending ? "A guardar…" : teamId ? "Guardar alterações" : "Criar equipa"}
        </button>
      </div>
    </form>
  );
}
