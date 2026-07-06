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
 * Version recomendada: analiza el archivo ANTES de subirlo, leyendo
 * directamente el File/Blob local con un object URL. Al ser same-origin
 * (blob:) nunca hay problema de CORS ni de "canvas contaminado", a
 * diferencia de analizar la imagen ya subida desde otro dominio.
 */
export function extraerColorDominanteDeArchivo(file: File): Promise<string> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    const limpiar = () => URL.revokeObjectURL(objectUrl);

    img.onload = () => {
      try {
        const tam = 48;
        const canvas = document.createElement("canvas");
        canvas.width = tam;
        canvas.height = tam;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          limpiar();
          return resolve("#ff2e88");
        }

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
          const peso = 0.15 + (s / 100) * 0.85 * (1 - Math.abs(l - 50) / 50);

          rTotal += r * peso;
          gTotal += g * peso;
          bTotal += b * peso;
          pesoTotal += peso;
        }

        limpiar();

        if (pesoTotal === 0) return resolve("#ff2e88");
        resolve(
          rgbToHex(rTotal / pesoTotal, gTotal / pesoTotal, bTotal / pesoTotal)
        );
      } catch {
        limpiar();
        resolve("#ff2e88");
      }
    };

    img.onerror = () => {
      limpiar();
      resolve("#ff2e88");
    };

    img.src = objectUrl;
  });
}

/**
 * Carga una imagen (incluso de otro origen, como Supabase Storage) y
 * calcula su color dominante muestreando pixeles en un canvas pequeño.
 * Se descarta el fondo casi-negro/casi-blanco cuando es posible, para
 * priorizar el color "con caracter" de la imagen en vez del vacio.
 *
 * Nota: si el origen remoto no envia cabeceras CORS permisivas, el
 * navegador puede bloquear la lectura de pixeles. Por eso el flujo de
 * subida usa `extraerColorDominanteDeArchivo` (arriba) sobre el
 * archivo local en vez de esta funcion.
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

/**
 * Extrae una PALETA de varios colores representativos de una imagen
 * (no solo un promedio), usando un mini k-means en espacio RGB sobre
 * una muestra reducida de pixeles. Sigue siendo 100% local/gratis:
 * unas pocas iteraciones sobre ~2000 pixeles no cuesta nada de tiempo.
 *
 * Se usa sobre el archivo LOCAL (antes de subir) para evitar cualquier
 * problema de CORS con imagenes ya alojadas en otro dominio.
 */
export function extraerPaletaDeArchivo(
  file: File,
  k = 5
): Promise<string[]> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    const limpiar = () => URL.revokeObjectURL(objectUrl);
    const fallback = ["#ff2e88", "#22e8ff", "#f5ff00", "#ff2e88", "#22e8ff"];

    img.onload = () => {
      try {
        const tam = 64;
        const canvas = document.createElement("canvas");
        canvas.width = tam;
        canvas.height = tam;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          limpiar();
          return resolve(fallback);
        }
        ctx.drawImage(img, 0, 0, tam, tam);
        const { data } = ctx.getImageData(0, 0, tam, tam);

        const puntos: [number, number, number][] = [];
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 32) continue;
          puntos.push([data[i], data[i + 1], data[i + 2]]);
        }
        limpiar();

        if (puntos.length === 0) return resolve(fallback);

        // Centroides iniciales: repartidos uniformemente sobre la muestra
        let centroides: [number, number, number][] = Array.from(
          { length: k },
          (_, i) => puntos[Math.floor((i * puntos.length) / k)]
        );

        let asignacion = new Array(puntos.length).fill(0);

        for (let iter = 0; iter < 6; iter++) {
          // Asignar cada punto al centroide mas cercano
          for (let p = 0; p < puntos.length; p++) {
            let mejor = 0;
            let mejorDist = Infinity;
            for (let c = 0; c < centroides.length; c++) {
              const dr = puntos[p][0] - centroides[c][0];
              const dg = puntos[p][1] - centroides[c][1];
              const db = puntos[p][2] - centroides[c][2];
              const dist = dr * dr + dg * dg + db * db;
              if (dist < mejorDist) {
                mejorDist = dist;
                mejor = c;
              }
            }
            asignacion[p] = mejor;
          }

          // Recalcular centroides como el promedio de sus puntos
          const sumas = Array.from({ length: k }, () => [0, 0, 0, 0]);
          for (let p = 0; p < puntos.length; p++) {
            const c = asignacion[p];
            sumas[c][0] += puntos[p][0];
            sumas[c][1] += puntos[p][1];
            sumas[c][2] += puntos[p][2];
            sumas[c][3] += 1;
          }
          centroides = sumas.map((s, i) =>
            s[3] > 0
              ? ([s[0] / s[3], s[1] / s[3], s[2] / s[3]] as [
                  number,
                  number,
                  number
                ])
              : centroides[i]
          );
        }

        // Ordenar por tamano de cluster (mas representativo primero)
        const conteos = new Array(k).fill(0);
        for (const a of asignacion) conteos[a]++;

        const paleta = centroides
          .map((c, i) => ({ color: rgbToHex(c[0], c[1], c[2]), peso: conteos[i] }))
          .sort((a, b) => b.peso - a.peso)
          .map((c) => c.color);

        resolve(paleta.length > 0 ? paleta : fallback);
      } catch {
        limpiar();
        resolve(fallback);
      }
    };

    img.onerror = () => {
      limpiar();
      resolve(fallback);
    };

    img.src = objectUrl;
  });
}

/**
 * A partir de todos los colores de paleta de todos los stickers de un
 * tablero, elige un puñado de tonos representativos y vivos para armar
 * un fondo tipo "aurora" con varios puntos de color (no solo 2).
 * Agrupa por matiz (bins de 30°) y devuelve el color mas vivo de cada
 * uno de los bins con mas presencia.
 */
export function seleccionarColoresDestacados(
  coloresHex: string[],
  maxColores = 5
): string[] {
  if (coloresHex.length === 0) {
    return ["#ff2e88", "#22e8ff", "#f5ff00", "#a855f7"];
  }

  const bins = new Map<number, { color: string; s: number; peso: number }[]>();

  for (const hex of coloresHex) {
    const { h, s, l } = hexToHsl(hex);
    if (l < 8 || l > 94) continue; // ignora casi-negro / casi-blanco
    const bin = Math.floor(h / 30) * 30;
    const lista = bins.get(bin) || [];
    lista.push({ color: hex, s, peso: 1 });
    bins.set(bin, lista);
  }

  const destacados = Array.from(bins.entries())
    .map(([, lista]) => {
      const masVivido = lista.reduce((a, b) => (b.s > a.s ? b : a));
      return { color: masVivido.color, peso: lista.length };
    })
    .sort((a, b) => b.peso - a.peso)
    .slice(0, maxColores)
    .map((d) => d.color);

  return destacados.length > 0 ? destacados : ["#ff2e88", "#22e8ff", "#f5ff00"];
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
