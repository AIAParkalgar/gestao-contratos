"use client";

import { useTransition } from "react";
import { deleteContract } from "@/app/(app)/contratos/actions";

export default function DeleteContractButton({ contractId }: { contractId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button type="button" className="btn btn-danger" disabled={pending}
      onClick={() => {
        if (!confirm("Tem a certeza que pretende apagar este contrato? Esta ação não pode ser desfeita.")) return;
        startTransition(async () => {
          const res = await deleteContract(contractId);
          if (res?.errors) alert(res.errors.join("\n"));
        });
      }}>
      {pending ? "A apagar…" : "Apagar"}
    </button>
  );
}
