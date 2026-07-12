"use client";

export type TipoPincel = "lapiz" | "marcador" | "pincel" | "borrador";

export interface PuntoTrazo {
  x: number;
  y: number;
  presion: number; // 0 a 1
  t: number; // timestamp, para calcular velocidad
}

export interface ConfigPincel {
  tipo: TipoPincel;
  color: string; // hex
  tamano: number; // grosor base, px
  opacidad: number; // 0 a 1
}

/**
 * Motor de dibujo: cada tipo de "pincel" tiene su propio algoritmo de
 * trazo, para que de verdad se sientan distintos (no solo un cambio
 * de grosor):
 *
 * - Lapiz: trazo fino, textura granulada (puntos semi-transparentes
 *   con jitter aleatorio), como grafito real.
 * - Marcador: trazo plano y semi-transparente, con
 *   globalCompositeOperation "multiply" para que se oscurezca donde
 *   se superpone, como un resaltador real.
 * - Pincel: grosor variable segun la velocidad del trazo (mas lento =
 *   mas grueso, como presionar mas fuerte), bordes suaves, textura de
 *   cerdas mediante varias lineas finas superpuestas.
 * - Borrador: usa "destination-out" para de verdad borrar pixeles.
 */

function distancia(a: PuntoTrazo, b: PuntoTrazo): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/** Punto medio entre dos puntos, usado para curvas suaves (quadraticCurveTo). */
function medio(a: PuntoTrazo, b: PuntoTrazo): { x: number; y: number } {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function hexToRgb(hex: string): [number, number, number] {
  const limpio = hex.replace("#", "");
  const bigint = parseInt(limpio, 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

/**
 * Dibuja el segmento mas reciente del trazo (entre el penultimo y el
 * ultimo punto) sobre el canvas. Se llama en cada movimiento del
 * puntero para pintar de forma incremental, sin tener que redibujar
 * todo el trazo desde el inicio.
 */
export function dibujarSegmento(
  ctx: CanvasRenderingContext2D,
  puntos: PuntoTrazo[],
  config: ConfigPincel
) {
  if (puntos.length < 2) return;
  const anterior = puntos[puntos.length - 2];
  const actual = puntos[puntos.length - 1];

  ctx.save();

  switch (config.tipo) {
    case "lapiz": {
      ctx.globalCompositeOperation = "source-over";
      const [r, g, b] = hexToRgb(config.color);
      const pasos = Math.max(2, Math.ceil(distancia(anterior, actual) / 1.5));
      for (let i = 0; i <= pasos; i++) {
        const t = i / pasos;
        const x = anterior.x + (actual.x - anterior.x) * t + (Math.random() - 0.5) * config.tamano * 0.35;
        const y = anterior.y + (actual.y - anterior.y) * t + (Math.random() - 0.5) * config.tamano * 0.35;
        const r2 = Math.max(0.4, (config.tamano / 2) * (0.5 + Math.random() * 0.5));
        ctx.beginPath();
        ctx.arc(x, y, r2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${config.opacidad * (0.35 + Math.random() * 0.35)})`;
        ctx.fill();
      }
      break;
    }

    case "marcador": {
      ctx.globalCompositeOperation = "multiply";
      ctx.strokeStyle = config.color;
      ctx.globalAlpha = Math.min(1, config.opacidad * 0.75);
      ctx.lineWidth = config.tamano * 1.6;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      const m = medio(anterior, actual);
      ctx.beginPath();
      ctx.moveTo(anterior.x, anterior.y);
      ctx.quadraticCurveTo(anterior.x, anterior.y, m.x, m.y);
      ctx.stroke();
      break;
    }

    case "pincel": {
      ctx.globalCompositeOperation = "source-over";
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = config.color;
      ctx.globalAlpha = config.opacidad;

      // Velocidad del trazo controla el grosor: mas lento = mas
      // grueso (como presionar mas fuerte con un pincel real).
      const dt = Math.max(1, actual.t - anterior.t);
      const vel = distancia(anterior, actual) / dt; // px/ms
      const factorVelocidad = Math.max(0.35, 1 - Math.min(vel * 4, 0.65));
      const presion = 0.6 + actual.presion * 0.4;
      const grosor = config.tamano * factorVelocidad * presion;

      // 3 "cerdas" ligeramente separadas para dar textura de pincel real
      const cerdas = [-0.28, 0, 0.28];
      for (const offset of cerdas) {
        const nx = -(actual.y - anterior.y);
        const ny = actual.x - anterior.x;
        const largo = Math.hypot(nx, ny) || 1;
        const ox = (nx / largo) * grosor * offset;
        const oy = (ny / largo) * grosor * offset;

        ctx.lineWidth = Math.max(0.6, grosor * (offset === 0 ? 1 : 0.6));
        ctx.beginPath();
        ctx.moveTo(anterior.x + ox, anterior.y + oy);
        ctx.lineTo(actual.x + ox, actual.y + oy);
        ctx.stroke();
      }
      break;
    }

    case "borrador": {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
      ctx.globalAlpha = 1;
      ctx.lineWidth = config.tamano * 2.2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(anterior.x, anterior.y);
      ctx.lineTo(actual.x, actual.y);
      ctx.stroke();
      break;
    }
  }

  ctx.restore();
}

export const PINCELES: { valor: TipoPincel; etiqueta: string }[] = [
  { valor: "lapiz", etiqueta: "Lápiz" },
  { valor: "marcador", etiqueta: "Marcador" },
  { valor: "pincel", etiqueta: "Pincel" },
  { valor: "borrador", etiqueta: "Borrador" },
];

export const COLORES_RAPIDOS = [
  "#000000",
  "#ffffff",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#78716c",
];
