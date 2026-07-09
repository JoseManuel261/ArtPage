import { NextResponse, type NextRequest } from "next/server";
import { calcularTokenAcceso } from "./lib/accesoToken";

/**
 * Candado de acceso a todo el sitio, gratis y sin servicios externos.
 *
 * Si defines la variable de entorno ACCESS_PASSCODE en Vercel, el
 * sitio completo queda protegido con esa clave: cualquiera que entre
 * sin el cookie de sesion correcto se redirige a /acceso.
 *
 * Si NO defines ACCESS_PASSCODE, el sitio se comporta como antes (sin
 * candado) — esta funcion es completamente opcional.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const rutasLibres =
    pathname.startsWith("/acceso") ||
    pathname.startsWith("/api/verificar-acceso") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname === "/icon.png" ||
    pathname === "/apple-icon.png" ||
    pathname === "/manifest.webmanifest";

  if (rutasLibres) return NextResponse.next();

  const passcode = process.env.ACCESS_PASSCODE;
  if (!passcode) return NextResponse.next(); // sin clave configurada = sitio abierto

  const cookie = request.cookies.get("acceso_token")?.value;
  const esperado = await calcularTokenAcceso(passcode);

  if (cookie === esperado) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/acceso";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
