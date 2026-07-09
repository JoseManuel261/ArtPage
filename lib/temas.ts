import type { TemaVisual } from "./types";

export interface DefinicionTema {
  id: TemaVisual;
  nombre: string;
  fondo: string;
  texto: string;
  textoSuave: string;
  superficie: string;
  acento: string;
  acentoSecundario: string;
  fuenteUI: string;
  /** Grosor del borde de tarjetas/botones, en px. Grueso = hacker/scrapbook, fino = minimal. */
  bordeGrosor: number;
  /** Radio de esquina, en px. 0 = filoso (hacker), >0 = suave (minimal/pastel). */
  bordeRadio: number;
  /** Sombra CSS lista para usar en style={{ boxShadow: ... }}. */
  sombra: string;
  sombraChica: string;
  /** Si usa etiquetas estilo terminal ("CARGAR_IMAGEN.exe") o lenguaje simple ("Subir foto"). */
  etiquetasTerminal: boolean;
  /** Si muestra efectos retro globales: scanlines, vignette, grano. Solo tiene sentido en "neon". */
  efectosRetro: boolean;
  claseFondo: string;
}

export const TEMAS: Record<TemaVisual, DefinicionTema> = {
  minimal: {
    id: "minimal",
    nombre: "Minimalista",
    fondo: "#fafaf9",
    texto: "#1c1917",
    textoSuave: "#78716c",
    superficie: "#ffffff",
    acento: "#111827",
    acentoSecundario: "#6366f1",
    fuenteUI: "'Inter', -apple-system, system-ui, sans-serif",
    bordeGrosor: 1,
    bordeRadio: 14,
    sombra: "0 8px 24px -8px rgba(0,0,0,0.18)",
    sombraChica: "0 2px 8px -2px rgba(0,0,0,0.15)",
    etiquetasTerminal: false,
    efectosRetro: false,
    claseFondo: "bg-[#fafaf9]",
  },
  neon: {
    id: "neon",
    nombre: "Neón / Glitch",
    fondo: "#0a0a0a",
    texto: "#e8e4d8",
    textoSuave: "rgba(232,228,216,0.5)",
    superficie: "#171717",
    acento: "#ff2e88",
    acentoSecundario: "#22e8ff",
    fuenteUI: "'JetBrains Mono', monospace",
    bordeGrosor: 4,
    bordeRadio: 0,
    sombra: "6px 6px 0px #000",
    sombraChica: "3px 3px 0px #000",
    etiquetasTerminal: true,
    efectosRetro: true,
    claseFondo: "bg-punk-black",
  },
  scrapbook: {
    id: "scrapbook",
    nombre: "Scrapbook vintage",
    fondo: "#e8dcc4",
    texto: "#3a2e22",
    textoSuave: "rgba(58,46,34,0.55)",
    superficie: "#fffaf0",
    acento: "#b5651d",
    acentoSecundario: "#7a8b5e",
    fuenteUI: "'Caveat', cursive",
    bordeGrosor: 3,
    bordeRadio: 2,
    sombra: "5px 5px 0px rgba(58,46,34,0.35)",
    sombraChica: "3px 3px 0px rgba(58,46,34,0.3)",
    etiquetasTerminal: false,
    efectosRetro: false,
    claseFondo: "bg-[#e8dcc4]",
  },
  pastel: {
    id: "pastel",
    nombre: "Pastel suave",
    fondo: "#fdf3f7",
    texto: "#5c4a52",
    textoSuave: "rgba(92,74,82,0.5)",
    superficie: "#ffffff",
    acento: "#f4a6c1",
    acentoSecundario: "#a6d8f4",
    fuenteUI: "'Caveat', cursive",
    bordeGrosor: 2,
    bordeRadio: 18,
    sombra: "0 10px 26px -10px rgba(244,166,193,0.5)",
    sombraChica: "0 4px 12px -4px rgba(244,166,193,0.45)",
    etiquetasTerminal: false,
    efectosRetro: false,
    claseFondo: "bg-[#fdf3f7]",
  },
};

export function obtenerTema(tema: TemaVisual | undefined | null): DefinicionTema {
  return TEMAS[tema || "minimal"];
}
