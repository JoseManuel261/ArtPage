import { NextRequest, NextResponse } from "next/server";

// Pollinations puede tardar en generar imagenes no cacheadas; le damos
// margen extra al tiempo maximo de esta funcion en Vercel.
export const maxDuration = 30;

/**
 * Genera una imagen con IA usando Pollinations.ai (gratis, sin llave)
 * desde el SERVIDOR, no desde el navegador.
 *
 * Por que en el servidor: el navegador aplica CORS a las peticiones
 * "fetch" hacia otros dominios, y Pollinations no garantiza cabeceras
 * CORS permisivas en su endpoint de imagenes. Un servidor no tiene esa
 * restriccion (CORS es una politica exclusiva de navegadores), asi que
 * pedimos la imagen aqui y se la pasamos al cliente ya lista.
 */
export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    if (typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json({ error: "Falta la descripcion" }, { status: 400 });
    }

    const url = `https://gen.pollinations.ai/image/${encodeURIComponent(
      prompt.trim()
    )}?width=512&height=512&nologo=true&safe=true`;

    const respuesta = await fetch(url, {
      headers: { Accept: "image/*" },
      // Evitamos que Next cachee peticiones con prompts distintos entre si.
      cache: "no-store",
    });

    if (!respuesta.ok) {
      return NextResponse.json(
        { error: `El servicio de IA respondio con error ${respuesta.status}` },
        { status: 502 }
      );
    }

    const contentType = respuesta.headers.get("content-type") || "image/jpeg";
    const bytes = await respuesta.arrayBuffer();

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Error generando imagen con IA:", err);
    return NextResponse.json(
      { error: "No se pudo generar la imagen. Intenta de nuevo." },
      { status: 500 }
    );
  }
}
