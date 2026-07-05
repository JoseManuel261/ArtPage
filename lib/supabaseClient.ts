import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;

// Supabase migro de las claves legacy "anon" / "service_role" (JWT) a las
// nuevas claves "publishable" (sb_publishable_...) y "secret" (sb_secret_...).
// Los proyectos creados desde nov. 2025 ya NO traen anon key por defecto,
// asi que este cliente usa la publishable key: es segura para el navegador
// (bloqueada por diseño si se usa como secret) y respeta igual las
// politicas de RLS que antes aplicaba la anon key.
const supabasePublishableKey = process.env
  .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY as string;

if (!supabaseUrl || !supabasePublishableKey) {
  // No lanzamos error en build para no romper Vercel si las envs
  // aun no estan configuradas, pero avisamos en consola del navegador.
  console.warn(
    "[Supabase] Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY en las variables de entorno."
  );
}

// NUNCA uses aqui una "secret key" (sb_secret_...): esta se ejecuta en el
// navegador del usuario y quedaria expuesta publicamente.
export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: { persistSession: false },
});

export const STICKERS_BUCKET = "imagenes_stickers";
