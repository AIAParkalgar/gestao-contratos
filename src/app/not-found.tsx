import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="text-xl font-semibold text-slate-900">Página não encontrada</h1>
      <p className="text-sm text-slate-500">O conteúdo não existe ou não tem permissão para o ver.</p>
      <Link href="/contratos" className="btn btn-secondary">Voltar aos contratos</Link>
    </main>
  );
}
