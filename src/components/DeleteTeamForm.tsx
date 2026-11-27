"use client";

import { useState, useTransition } from "react";
import { deleteTeam } from "@/app/(app)/admin/equipas/actions";
import ErrorBox from "./ErrorBox";
import { TO_CONFIDENTIAL } from "@/lib/constants";
import { useHydrated } from "@/lib/useHydrated";

export default function DeleteTeamForm({
  teamId,
  teamName,
  contractCount,
  restrictedCount,
  memberCount,
  otherTeams,
}: {
  teamId: string;
  teamName: string;
  contractCount: number;
  restrictedCount: number;
  memberCount: number;
  otherTeams: { id: string; name: string }[];
}) {
  const [target, setTarget] = useState(otherTeams[0]?.id ?? TO_CONFIDENTIAL);
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const hydrated = useHydrated();

  function onDelete() {
    const dest = target === TO_CONFIDENTIAL
      ? "os contratos restritos passam a confidenciais"
      : `os contratos passam para "${otherTeams.find((t) => t.id === target)?.name}"`;
    const msg = contractCount > 0
      ? `Apagar a equipa "${teamName}"? ${dest[0].toUpperCase()}${dest.slice(1)}. Esta ação não pode ser desfeita.`
      : `Apagar a equipa "${teamName}"? Esta ação não pode ser desfeita.`;
    if (!confirm(msg)) return;
    setErrors([]);
    startTransition(async () => {
      const res = await deleteTeam(teamId, target);
      if (res?.errors) setErrors(res.errors);
    });
  }

  return (
    <section className="card max-w-2xl space-y-4 border-red-200 p-5">
      <div>
        <h2 className="text-base font-semibold text-red-700">Apagar equipa</h2>
        <p className="mt-1 text-sm text-slate-600">
          {memberCount > 0
            ? `${memberCount} membro${memberCount === 1 ? "" : "s"} deixa${memberCount === 1 ? "" : "m"} de pertencer a esta equipa (as contas não são apagadas). `
            : "A equipa não tem membros. "}
          {contractCount > 0
            ? `Tem ${contractCount} contrato${contractCount === 1 ? "" : "s"} associado${contractCount === 1 ? "" : "s"}${restrictedCount > 0 ? `, ${restrictedCount} restrito${restrictedCount === 1 ? "" : "s"} a esta equipa` : ""}.`
            : "Não tem contratos associados."}
        </p>
      </div>
      <ErrorBox errors={errors} />
      {contractCount > 0 && (
        <div className="max-w-md">
          <label className="label" htmlFor="target">Para onde passam os contratos?</label>
          <select id="target" className="input" value={target} onChange={(e) => setTarget(e.target.value)}>
            {otherTeams.map((t) => <option key={t.id} value={t.id}>Passar para a equipa {t.name}</option>)}
            <option value={TO_CONFIDENTIAL}>Ficar sem equipa (os restritos passam a confidenciais)</option>
          </select>
          {target === TO_CONFIDENTIAL && restrictedCount > 0 && (
            <p className="mt-1 text-xs text-amber-700">
              Os contratos restritos passam a ser vistos apenas por quem os criou e pelos administradores.
            </p>
          )}
        </div>
      )}
      <button type="button" className="btn btn-danger" onClick={onDelete} disabled={pending || !hydrated}>
        {pending ? "A apagar…" : "Apagar equipa"}
      </button>
    </section>
  );
}
