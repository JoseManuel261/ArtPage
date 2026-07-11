import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

const MODELO = "@cf/stabilityai/stable-diffusion-xl-base-1.0";

/**
 * Genera una imagen con IA usando Cloudflare Workers AI — capa
 * gratuita real y estable (10,000 "neuronas" gratis al dia, sin
 * tarjeta de credito), respaldada por infraestructura de Cloudflare
 * en vez de un proyecto pequeño/comunitario.
 *
 * (Historial: se probo primero con Pollinations.ai, que resulto tener
 * caidas frecuentes documentadas durante 2026 y no es confiable para
 * depender de el. Tambien se evaluo la API de Gemini de Google, mejor
 * descartada porque su generacion de imagenes NUNCA es gratis, ni con
 * una API key nueva.)
 *
 * Requiere DOS variables de entorno en Vercel:
 *   CLOUDFLARE_ACCOUNT_ID  — tu ID de cuenta de Cloudflare
 *   CLOUDFLARE_API_TOKEN   — un token con permiso "Workers AI"
 *
 * Como conseguirlas (gratis, ~2 minutos):
 *   1. Crea una cuenta en https://dash.cloudflare.com/sign-up
 *   2. En el panel, ve a "AI" > "Workers AI"
 *   3. Ahi mismo se muestra tu Account ID
 *   4. Genera un token en "Manage Account" > "API Tokens" con el
 *      permiso "Workers AI - Read/Edit"
 */
export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    if (typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json({ error: "Falta la descripcion." }, { status: 400 });
    }

    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;

    if (!accountId || !apiToken) {
      return NextResponse.json(
        {
          error:
            "Falta configurar CLOUDFLARE_ACCOUNT_ID y CLOUDFLARE_API_TOKEN en el servidor. Son gratis: crea una cuenta en cloudflare.com y activa Workers AI.",
        },
        { status: 500 }
      );
    }

    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${MODELO}`;

    const respuesta = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt: prompt.trim() }),
      cache: "no-store",
      signal: AbortSignal.timeout(28000),
    });

    const contentType = respuesta.headers.get("content-type") || "";

    if (!respuesta.ok) {
      // Cloudflare devuelve JSON con detalle del error cuando algo falla.
      let detalle = "";
      try {
        const data = await respuesta.json();
        detalle = data?.errors?.[0]?.message || JSON.stringify(data);
      } catch {
        detalle = await respuesta.text();
      }
      console.error("Error de Cloudflare Workers AI:", respuesta.status, detalle);

      if (respuesta.status === 429) {
        return NextResponse.json(
          { error: "Se alcanzo el limite gratuito de generaciones por hoy. Vuelve mañana o espera un momento." },
          { status: 429 }
        );
      }
      if (respuesta.status === 401 || respuesta.status === 403) {
        return NextResponse.json(
          { error: "Las credenciales de Cloudflare no son validas. Revisa CLOUDFLARE_ACCOUNT_ID y CLOUDFLARE_API_TOKEN en Vercel." },
          { status: 500 }
        );
      }
      return NextResponse.json(
        { error: `El servicio de IA respondio con error ${respuesta.status}.` },
        { status: 502 }
      );
    }

    // Si Cloudflare responde JSON en vez de imagen, algo salio mal
    // aunque el status haya sido 200 (poco comun, pero pasa).
    if (contentType.includes("application/json")) {
      const data = await respuesta.json();
      console.error("Cloudflare respondio JSON en vez de imagen:", data);
      return NextResponse.json(
        { error: "La IA no devolvio una imagen valida. Intenta con otra descripcion." },
        { status: 502 }
      );
    }

    const bytes = await respuesta.arrayBuffer();

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": contentType || "image/png",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Error generando imagen con IA:", err);
    if (err instanceof Error && err.name === "TimeoutError") {
      return NextResponse.json(
        { error: "El servicio de IA tardo demasiado en responder. Intenta de nuevo." },
        { status: 504 }
      );
    }
    return NextResponse.json(
      { error: "No se pudo generar la imagen. Intenta de nuevo." },
      { status: 500 }
    );
  }
}
