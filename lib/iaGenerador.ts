"use client";

/**
 * Generacion de imagenes con IA usando Cloudflare Workers AI — capa
 * gratuita real y estable (10,000 neuronas gratis al dia, respaldada
 * por infraestructura de Cloudflare).
 *
 * La peticion real la hace nuestra propia ruta de servidor
 * (`/api/generar-imagen`), no el navegador: asi las credenciales
 * nunca se exponen en el codigo del cliente, y evitamos cualquier
 * bloqueo de CORS.
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
  // Nos aseguramos de que el tipo sea explicitamente una imagen: si el
  // blob llega sin tipo (o con uno generico como
  // "application/octet-stream"), el analisis de color y la vista
  // previa pueden fallar en silencio.
  const tipoFinal = blob.type && blob.type.startsWith("image/") ? blob.type : "image/png";
  const extension = tipoFinal.split("/")[1] || "png";

  return new File([blob], `ia-${Date.now()}.${extension}`, {
    type: tipoFinal,
  });
}
