/**
 * Utilidad compartida entre el middleware (Edge runtime) y la ruta de
 * API (Node runtime) para generar un token de sesion a partir de la
 * clave de acceso. Usa Web Crypto (crypto.subtle), disponible en
 * ambos entornos, asi que no depende de ninguna libreria externa.
 *
 * El token nunca expone la clave real: es un hash. Si alguien logra
 * ver la cookie, no puede reconstruir la clave original a partir de
 * ella.
 */
export async function calcularTokenAcceso(clave: string): Promise<string> {
  const datos = new TextEncoder().encode(`lienzo-colage-acceso:${clave}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", datos);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
