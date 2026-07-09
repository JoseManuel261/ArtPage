"use client";

/**
 * Generacion de imagenes con IA usando Pollinations.ai — gratis, sin
 * registro, sin llave de API.
 *
 * La peticion real al servicio externo la hace nuestra propia ruta de
 * servidor (`/api/generar-imagen`), no el navegador: asi evitamos
 * cualquier bloqueo de CORS, que es la causa mas comun de que la
 * generacion "falle" sin explicacion clara en el navegador.
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
