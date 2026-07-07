"use client";

/**
 * Generacion de imagenes con IA usando Pollinations.ai — gratis, sin
 * registro, sin llave de API. Basta con construir una URL con el
 * texto describiendo lo que quieres, y devuelve la imagen directa.
 *
 * Docs: https://gen.pollinations.ai/docs
 * Endpoint: https://gen.pollinations.ai/image/{prompt}
 *
 * Descargamos el resultado como Blob y lo re-subimos a nuestro propio
 * Storage de Supabase (igual que una foto normal), para que quede
 * guardado de forma permanente y no dependa de la disponibilidad del
 * servicio externo a largo plazo.
 */
export async function generarImagenIA(
  prompt: string,
  opciones?: { ancho?: number; alto?: number }
): Promise<File> {
  const ancho = opciones?.ancho ?? 512;
  const alto = opciones?.alto ?? 512;

  const url = `https://gen.pollinations.ai/image/${encodeURIComponent(
    prompt
  )}?width=${ancho}&height=${alto}&nologo=true&safe=true`;

  const respuesta = await fetch(url);
  if (!respuesta.ok) {
    throw new Error(`Error generando imagen con IA: ${respuesta.status}`);
  }

  const blob = await respuesta.blob();
  return new File([blob], `ia-${Date.now()}.jpg`, {
    type: blob.type || "image/jpeg",
  });
}
