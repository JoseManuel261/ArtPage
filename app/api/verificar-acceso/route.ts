import { NextRequest, NextResponse } from "next/server";
import { calcularTokenAcceso } from "@/lib/accesoToken";

export async function POST(request: NextRequest) {
  const { clave } = await request.json();
  const passcodeReal = process.env.ACCESS_PASSCODE;

  // Si no hay clave configurada en el servidor, el sitio es abierto.
  if (!passcodeReal) {
    return NextResponse.json({ ok: true });
  }

  if (typeof clave !== "string" || clave !== passcodeReal) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const token = await calcularTokenAcceso(passcodeReal);
  const response = NextResponse.json({ ok: true });
  response.cookies.set("acceso_token", token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 180, // 180 dias
    path: "/",
  });
  return response;
}
