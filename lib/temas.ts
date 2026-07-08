import type { TemaVisual } from "./types";

export interface DefinicionTema {
  fondo: string;
  texto: string;
  acento: string;
  acentoSecundario: string;
  fuenteUI: string;
  bordeSticker: string;
  texturaOpacidad: number;
  /** Clase de Tailwind para el fondo del lienzo (color base). */
  claseFondo: string;
}

export const TEMAS: Record<TemaVisual, DefinicionTema> = {
  neon: {
    fondo: "#0a0a0a",
    texto: "#e8e4d8",
    acento: "#ff2e88",
    acentoSecundario: "#22e8ff",
    fuenteUI: "'JetBrains Mono', monospace",
    bordeSticker: "#ffffff",
    texturaOpacidad: 0.55,
    claseFondo: "bg-punk-black",
  },
  scrapbook: {
    fondo: "#e8dcc4",
    texto: "#3a2e22",
    acento: "#b5651d",
    acentoSecundario: "#7a8b5e",
    fuenteUI: "'Caveat', cursive",
    bordeSticker: "#fffaf0",
    texturaOpacidad: 0.3,
    claseFondo: "bg-[#e8dcc4]",
  },
  pastel: {
    fondo: "#fdf3f7",
    texto: "#5c4a52",
    acento: "#f4a6c1",
    acentoSecundario: "#a6d8f4",
    fuenteUI: "'Caveat', cursive",
    bordeSticker: "#ffffff",
    texturaOpacidad: 0.25,
    claseFondo: "bg-[#fdf3f7]",
  },
};

export function obtenerTema(tema: TemaVisual | undefined | null): DefinicionTema {
  return TEMAS[tema || "neon"];
}
