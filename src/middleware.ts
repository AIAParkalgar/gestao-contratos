import { NextResponse, type NextRequest } from "next/server";

// Verificação rápida: sem cookie de sessão → login.
// A validação real da sessão é feita no servidor (requireUser / requireAdmin).
export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname === "/login") return;
  if (!req.cookies.has("sessao")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
