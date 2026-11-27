"use client";

import { useEffect, useState } from "react";

/**
 * false até o JavaScript da página arrancar. Serve para manter os botões de envio
 * desativados enquanto o formulário ainda não funciona (ex.: ligações lentas).
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
