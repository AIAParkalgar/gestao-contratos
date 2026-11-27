import { requireUser } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/constants";
import PasswordForm from "./PasswordForm";

export default async function AccountPage() {
  const user = await requireUser();
  return (
    <div className="max-w-xl space-y-5">
      <h1 className="text-xl font-semibold text-slate-900">A minha conta</h1>
      <section className="card p-5">
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div><dt className="text-slate-500">Nome</dt><dd className="font-medium">{user.name}</dd></div>
          <div><dt className="text-slate-500">Email</dt><dd className="font-medium">{user.email}</dd></div>
          <div><dt className="text-slate-500">Perfil</dt><dd className="font-medium">{ROLE_LABELS[user.role]}</dd></div>
          <div><dt className="text-slate-500">Equipas</dt><dd className="font-medium">{user.teams.map((t) => t.name).join(", ") || "—"}</dd></div>
        </dl>
      </section>
      <section className="card p-5">
        <h2 className="mb-4 text-base font-semibold text-slate-900">Alterar password</h2>
        <PasswordForm />
      </section>
    </div>
  );
}
