/**
 * Analisis de color 100% client-side, sin ninguna API de pago.
 *
 * Cada vez que se sube una imagen, la leemos en un <canvas> oculto,
 * muestreamos sus pixeles y calculamos su color dominante. Con los
 * colores dominantes de todos los stickers de un tablero, calculamos
 * un "estado de animo" (paleta ambiental) que el lienzo adopta como
 * propio: fondo, brillos y acentos se destiñen suavemente hacia esa
 * paleta. Nada de esto llama a un servicio externo: es matematica de
 * color pura corriendo en el navegador de quien lo usa.
 */

export interface ColorHSL {
  h: number; // 0-360
  s: number; // 0-100
  l: number; // 0-100
}

/** Convierte un hex "#rrggbb" a HSL. */
export function hexToHsl(hex: string): ColorHSL {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHsl(r, g, b);
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace("#", "");
  const bigint = parseInt(clean, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n)))
    .toString(16)
    .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function rgbToHsl(r: number, g: number, b: number): ColorHSL {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      default:
        h = (rn - gn) / d + 4;
    }
    h *= 60;
  }

  return { h, s: s * 100, l: l * 100 };
}

export function hslToHex(h: number, s: number, l: number): string {
  const sN = s / 100;
  const lN = l / 100;
  const c = (1 - Math.abs(2 * lN - 1)) * sN;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lN - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;

  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

/**
 * Carga una imagen (incluso de otro origen, como Supabase Storage) y
 * calcula su color dominante muestreando pixeles en un canvas pequeño.
 * Se descarta el fondo casi-negro/casi-blanco cuando es posible, para
 * priorizar el color "con caracter" de la imagen en vez del vacio.
 */
export function extraerColorDominante(url: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    const salirConFallback = () => resolve("#ff2e88");

    img.onload = () => {
      try {
        const tam = 48; // muestreo pequeno = rapido y suficiente
        const canvas = document.createElement("canvas");
        canvas.width = tam;
        canvas.height = tam;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return salirConFallback();

        ctx.drawImage(img, 0, 0, tam, tam);
        const { data } = ctx.getImageData(0, 0, tam, tam);

        let rTotal = 0;
        let gTotal = 0;
        let bTotal = 0;
        let pesoTotal = 0;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const alpha = data[i + 3];
          if (alpha < 32) continue;

          const { s, l } = rgbToHsl(r, g, b);
          // Le damos mas peso a pixeles saturados y de brillo medio:
          // asi un fondo blanco o negro no "aplana" el color detectado.
          const peso = 0.15 + (s / 100) * 0.85 * (1 - Math.abs(l - 50) / 50);

          rTotal += r * peso;
          gTotal += g * peso;
          bTotal += b * peso;
          pesoTotal += peso;
        }

        if (pesoTotal === 0) return salirConFallback();

        resolve(
          rgbToHex(rTotal / pesoTotal, gTotal / pesoTotal, bTotal / pesoTotal)
        );
      } catch {
        // Si el navegador bloquea la lectura de pixeles (CORS estricto),
        // no rompemos la subida del sticker: solo perdemos el dato de color.
        salirConFallback();
      }
    };

    img.onerror = salirConFallback;
    img.src = url;
  });
}

export interface EstadoAnimo {
  primario: string;
  secundario: string;
  glow: string;
  etiqueta: string;
}

const ETIQUETAS: { test: (h: ColorHSL) => boolean; nombre: string }[] = [
  { test: (h) => h.s < 18, nombre: "escala de grises" },
  { test: (h) => h.h < 20 || h.h >= 340, nombre: "rojo carmesi" },
  { test: (h) => h.h >= 20 && h.h < 45, nombre: "naranja oxido" },
  { test: (h) => h.h >= 45 && h.h < 70, nombre: "amarillo acido" },
  { test: (h) => h.h >= 70 && h.h < 160, nombre: "verde toxico" },
  { test: (h) => h.h >= 160 && h.h < 200, nombre: "cian electrico" },
  { test: (h) => h.h >= 200 && h.h < 260, nombre: "azul neon" },
  { test: (h) => h.h >= 260 && h.h < 310, nombre: "violeta ultra" },
  { test: (h) => h.h >= 310 && h.h < 340, nombre: "fucsia pop" },
];

function etiquetarHue(h: ColorHSL): string {
  const match = ETIQUETAS.find((e) => e.test(h));
  return match ? match.nombre : "neutro";
}

/**
 * Promedia varios colores hex en el espacio HSL (con media circular
 * para el matiz) y devuelve una paleta de 2 tonos + un glow + una
 * etiqueta textual describiendo el "estado de animo" resultante.
 * Todo determinista, sin llamadas externas.
 */
export function calcularEstadoAnimo(coloresHex: string[]): EstadoAnimo {
  if (coloresHex.length === 0) {
    return {
      primario: "#ff2e88",
      secundario: "#22e8ff",
      glow: "#ff2e88",
      etiqueta: "collage neutro",
    };
  }

  let sumSin = 0;
  let sumCos = 0;
  let sumS = 0;
  let sumL = 0;

  for (const hex of coloresHex) {
    const { h, s, l } = hexToHsl(hex);
    const rad = (h * Math.PI) / 180;
    sumSin += Math.sin(rad);
    sumCos += Math.cos(rad);
    sumS += s;
    sumL += l;
  }

  const n = coloresHex.length;
  let hPromedio = (Math.atan2(sumSin / n, sumCos / n) * 180) / Math.PI;
  if (hPromedio < 0) hPromedio += 360;
  const sPromedio = Math.min(100, (sumS / n) * 1.15); // un poco mas vivo
  const lPromedio = Math.max(35, Math.min(65, sumL / n));

  const primario = hslToHex(hPromedio, sPromedio, lPromedio);
  const secundario = hslToHex((hPromedio + 150) % 360, sPromedio, lPromedio);
  const glow = hslToHex(hPromedio, Math.min(100, sPromedio + 20), 55);

  return {
    primario,
    secundario,
    glow,
    etiqueta: etiquetarHue({ h: hPromedio, s: sPromedio, l: lPromedio }),
  };
}
