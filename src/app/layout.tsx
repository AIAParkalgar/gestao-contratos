import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gestão de Contratos",
  description: "Plataforma de gestão de contratos",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-PT">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
