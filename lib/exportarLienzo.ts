"use client";

import type { Sticker } from "./types";

/**
 * Compone todo el tablero (capa de dibujo de fondo + fotos + cartelitos
 * de texto) en un solo canvas y lo descarga como PNG. 100% nativo del
 * navegador (Canvas API): sin librerias externas, sin costo.
 *
 * Dibujamos cada elemento con su propia rotacion/escala/borde blanco,
 * replicando el look del lienzo en vivo, para que el archivo final
 * sirva como recuerdo o para imprimir.
 */

const TAM_IMAGEN = 200; // tamano de referencia para fotos (mas nitido que en pantalla)
const ANCHO_TEXTO = 260;
const ALTO_TEXTO = 200;
const MARGEN = 160;

interface OpcionesExportar {
  /** Color de fondo del lienzo exportado (por defecto, el del tema activo). */
  colorFondo?: string;
  /** URL del dibujo guardado de este tablero (capa CapaDibujo), si existe. */
  dibujoUrl?: string | null;
}

function footprint(sticker: Sticker): { w: number; h: number } {
  if (sticker.tipo === "texto") {
    return { w: ANCHO_TEXTO * sticker.scale, h: ALTO_TEXTO * sticker.scale };
  }
  return { w: TAM_IMAGEN * sticker.scale, h: TAM_IMAGEN * sticker.scale };
}

function dibujarBordeYSombra(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number
) {
  ctx.shadowColor = "rgba(0,0,0,0.85)";
  ctx.shadowOffsetX = 8;
  ctx.shadowOffsetY = 8;
  const borde = 10;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(-w / 2 - borde, -h / 2 - borde, w + borde * 2, h + borde * 2);
  ctx.shadowColor = "transparent";
}

function envolverTexto(
  ctx: CanvasRenderingContext2D,
  texto: string,
  maxAncho: number
): string[] {
  const palabras = texto.split(/\s+/);
  const lineas: string[] = [];
  let actual = "";

  for (const palabra of palabras) {
    const prueba = actual ? `${actual} ${palabra}` : palabra;
    if (ctx.measureText(prueba).width > maxAncho && actual) {
      lineas.push(actual);
      actual = palabra;
    } else {
      actual = prueba;
    }
  }
  if (actual) lineas.push(actual);
  return lineas.slice(0, 6);
}

function cargarImagen(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export async function exportarLienzoComoPng(
  stickers: Sticker[],
  nombreTablero: string,
  opciones: OpcionesExportar = {}
): Promise<void> {
  const { colorFondo = "#0a0a0a", dibujoUrl = null } = opciones;

  if (stickers.length === 0 && !dibujoUrl) return;

  const minX = stickers.length ? Math.min(...stickers.map((s) => s.x)) - MARGEN : 0;
  const minY = stickers.length ? Math.min(...stickers.map((s) => s.y)) - MARGEN : 0;
  const maxX = stickers.length
    ? Math.max(...stickers.map((s) => s.x + footprint(s).w)) + MARGEN
    : 800;
  const maxY = stickers.length
    ? Math.max(...stickers.map((s) => s.y + footprint(s).h)) + MARGEN
    : 800;

  const ancho = Math.max(600, maxX - minX);
  const alto = Math.max(600, maxY - minY);

  const canvas = document.createElement("canvas");
  canvas.width = ancho;
  canvas.height = alto;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.fillStyle = colorFondo;
  ctx.fillRect(0, 0, ancho, alto);

  // Capa de dibujo: se guardo con el origen (0,0) del contenedor
  // visible, que es el mismo sistema de coordenadas que usan x/y de
  // los stickers — asi que se ubica en (0 - minX, 0 - minY).
  if (dibujoUrl) {
    const imgDibujo = await cargarImagen(dibujoUrl);
    if (imgDibujo) {
      try {
        ctx.drawImage(imgDibujo, -minX, -minY, imgDibujo.naturalWidth, imgDibujo.naturalHeight);
      } catch {
        // Si el dibujo bloquea por CORS, seguimos sin el (las fotos igual se exportan).
      }
    }
  }

  // Precargamos solo las imagenes (los cartelitos de texto no tienen
  // imagen que cargar, se dibujan directo con fillText).
  const imagenesPorId = new Map<string, HTMLImageElement | null>();
  await Promise.all(
    stickers
      .filter((s) => s.tipo === "imagen")
      .map(async (s) => {
        imagenesPorId.set(s.id, await cargarImagen(s.image_url));
      })
  );

  const ordenados = [...stickers].sort((a, b) => a.z_index - b.z_index);

  for (const sticker of ordenados) {
    const { w, h } = footprint(sticker);
    const cx = sticker.x - minX + w / 2;
    const cy = sticker.y - minY + h / 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((sticker.rotation * Math.PI) / 180);
    dibujarBordeYSombra(ctx, w, h);

    if (sticker.tipo === "texto") {
      ctx.fillStyle = sticker.color_fondo || "#fff4d6";
      ctx.fillRect(-w / 2, -h / 2, w, h);

      ctx.fillStyle = "#0a0a0a";
      ctx.font = "28px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const lineas = envolverTexto(ctx, sticker.texto || "", w - 40);
      const altoLinea = 34;
      const yInicial = -((lineas.length - 1) * altoLinea) / 2;
      lineas.forEach((linea, i) => {
        ctx.fillText(linea, 0, yInicial + i * altoLinea);
      });
    } else {
      const img = imagenesPorId.get(sticker.id);
      if (img) {
        try {
          ctx.drawImage(img, -w / 2, -h / 2, w, h);
        } catch {
          // Si una imagen puntual bloquea por CORS, seguimos con las demas.
        }
      }
    }

    ctx.restore();
  }

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = `${nombreTablero.replace(/\s+/g, "_")}_lienzo.png`;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    URL.revokeObjectURL(url);
  }, "image/png");
}
