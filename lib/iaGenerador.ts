"use client";

/**
 * Generacion de imagenes con IA usando la API de Gemini (Google) —
 * capa gratuita real, sin tarjeta de credito (solo requiere una API
 * key gratuita, ver /api/generar-imagen para instrucciones).
 *
 * La peticion real la hace nuestra propia ruta de servidor
 * (`/api/generar-imagen`), no el navegador: asi la API key nunca se
 * expone en el codigo del cliente, y evitamos cualquier bloqueo de
 * CORS.
 */
export async function generarImagenIA(prompt: string): Promise<File> {
  const respuesta = await fetch("/api/generar-imagen", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });

  if (!respuesta.ok) {
    let mensaje = "No se pudo generar la imagen.";
    try {
      const data = await respuesta.json();
      if (data?.error) mensaje = data.error;
    } catch {
      // el cuerpo no era JSON (por ejemplo, un error de gateway); usamos el mensaje generico
    }
    throw new Error(mensaje);
  }

  const blob = await respuesta.blob();
  return new File([blob], `ia-${Date.now()}.jpg`, {
    type: blob.type || "image/jpeg",
  });
}
