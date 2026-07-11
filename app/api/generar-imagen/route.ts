import { NextRequest, NextResponse } from "next/server";

// Pollinations puede tardar en generar imagenes no cacheadas; le damos
// margen extra al tiempo maximo de esta funcion en Vercel.
export const maxDuration = 30;

/**
 * Genera una imagen con IA usando Pollinations.ai — gratis de verdad,
 * sin llave de API, sin tarjeta de credito, sin limite de facturacion.
 *
 * (Nota: se evaluo usar la API de Gemini de Google, pero se descarto:
 * a diferencia de sus modelos de texto, la generacion de imagenes de
 * Gemini NO tiene capa gratuita — cobra desde $0.045 por imagen sin
 * excepcion, incluso con una API key nueva. Pollinations si es
 * genuinamente gratis.)
 *
 * La peticion se hace desde el SERVIDOR, no desde el navegador: el
 * navegador aplica CORS a las peticiones "fetch" hacia otros dominios,
 * y Pollinations no garantiza cabeceras CORS permisivas en su endpoint
 * de imagenes. Un servidor no tiene esa restriccion (CORS es una
 * politica exclusiva de navegadores), asi que pedimos la imagen aqui y
 * se la pasamos al cliente ya lista — esto es lo que de verdad
 * resuelve el "no genera nada" que veniamos arrastrando.
 */
export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    if (typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json({ error: "Falta la descripcion." }, { status: 400 });
    }

    const url = `https://gen.pollinations.ai/image/${encodeURIComponent(
      prompt.trim()
    )}?width=512&height=512&nologo=true&safe=true`;

    const respuesta = await fetch(url, {
      headers: { Accept: "image/*" },
      cache: "no-store",
      signal: AbortSignal.timeout(28000),
    });

    if (!respuesta.ok) {
      console.error("Error de Pollinations:", respuesta.status);
      return NextResponse.json(
        { error: `El servicio de IA respondio con error ${respuesta.status}. Intenta de nuevo.` },
        { status: 502 }
      );
    }

    const contentType = respuesta.headers.get("content-type") || "image/jpeg";
    const bytes = await respuesta.arrayBuffer();

    // Confirmamos que de verdad llego una imagen (a veces un error
    // devuelve una pagina HTML con status 200, lo cual rompe todo
    // silenciosamente si no lo validamos).
    if (!contentType.startsWith("image/") || bytes.byteLength < 500) {
      return NextResponse.json(
        { error: "La IA no devolvio una imagen valida. Intenta con otra descripcion." },
        { status: 502 }
      );
    }

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": contentType,
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
