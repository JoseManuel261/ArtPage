import { NextRequest, NextResponse } from "next/server";

// Gemini a veces tarda unos segundos en generar; le damos margen.
export const maxDuration = 30;

const MODELO = "gemini-2.5-flash-image";

/**
 * Genera una imagen con IA usando la API de Gemini (Google), que
 * ofrece una capa gratuita real para el modelo "gemini-2.5-flash-image"
 * (apodado "Nano Banana"): no requiere tarjeta de credito, solo una
 * API key gratuita de https://aistudio.google.com/apikey
 *
 * La peticion se hace desde el SERVIDOR (no desde el navegador) por
 * dos razones: para no exponer la API key en el codigo del cliente,
 * y para evitar cualquier restriccion de CORS.
 *
 * Requiere la variable de entorno GEMINI_API_KEY configurada en
 * Vercel (Settings > Environment Variables). Sin ella, esta ruta
 * responde con un error explicando como conseguirla.
 */
export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    if (typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json({ error: "Falta la descripcion." }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Falta configurar GEMINI_API_KEY en el servidor. Consigue una llave gratis en https://aistudio.google.com/apikey y agregala en Vercel > Settings > Environment Variables.",
        },
        { status: 500 }
      );
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent?key=${apiKey}`;

    const respuestaGemini = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt.trim() }] }],
      }),
      cache: "no-store",
    });

    if (!respuestaGemini.ok) {
      if (respuestaGemini.status === 429) {
        return NextResponse.json(
          { error: "Se alcanzo el limite gratuito de generaciones por minuto. Espera un momento y vuelve a intentar." },
          { status: 429 }
        );
      }
      const detalle = await respuestaGemini.text();
      console.error("Error de Gemini:", respuestaGemini.status, detalle);
      return NextResponse.json(
        { error: `El servicio de IA respondio con error ${respuestaGemini.status}.` },
        { status: 502 }
      );
    }

    const data = await respuestaGemini.json();
    const partes = data?.candidates?.[0]?.content?.parts || [];
    const partesImagen = partes.find((p: any) => p.inlineData?.data);

    if (!partesImagen) {
      return NextResponse.json(
        { error: "La IA no devolvio una imagen. Intenta con otra descripcion." },
        { status: 502 }
      );
    }

    const base64 = partesImagen.inlineData.data as string;
    const mimeType = partesImagen.inlineData.mimeType || "image/png";
    const bytes = Buffer.from(base64, "base64");

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
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
