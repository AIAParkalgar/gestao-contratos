"use client";

import { useState, useTransition } from "react";
import { changePassword } from "./actions";
import ErrorBox from "@/components/ErrorBox";

export default function PasswordForm() {
  const [v, setV] = useState({ current: "", next: "", confirm: "" });
  const [errors, setErrors] = useState<string[]>([]);
  const [ok, setOk] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors([]);
    setOk(false);
    startTransition(async () => {
      const res = await changePassword(v);
      if (res.errors) setErrors(res.errors);
      if (res.ok) {
        setOk(true);
        setV({ current: "", next: "", confirm: "" });
      }
    });
  }

  const field = (key: keyof typeof v, label: string, auto: string) => (
    <div>
      <label className="label" htmlFor={key}>{label}</label>
      <input id={key} type="password" autoComplete={auto} required className="input"
        value={v[key]} onChange={(e) => setV({ ...v, [key]: e.target.value })} />
    </div>
  );

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <ErrorBox errors={errors} />
      {ok && <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">Password alterada com sucesso.</p>}
      {field("current", "Password atual", "current-password")}
      {field("next", "Nova password (mín. 8 caracteres)", "new-password")}
      {field("confirm", "Confirmar nova password", "new-password")}
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "A guardar…" : "Alterar password"}
      </button>
    </form>
  );
}
