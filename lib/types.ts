export type FilterType = "raw" | "hackeado" | "duotone";

/** "imagen": foto subida o generada con IA. "texto": cartelito de texto. */
export type TipoSticker = "imagen" | "texto";

export interface Tablero {
  id: string;
  nombre: string;
  created_at: string;
}

export interface Sticker {
  id: string;
  tablero_id: string;
  tipo: TipoSticker;
  image_url: string;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  filter_type: FilterType;
  z_index: number;
  /** Color dominante detectado en la imagen (hex), calculado en el navegador. */
  dominant_color: string | null;
  /** Paleta completa de colores representativos (varios tonos), para el fondo tipo aurora. */
  palette: string[] | null;
  /** Contenido del cartelito, solo si tipo === "texto". */
  texto: string | null;
  /** Color de fondo del cartelito, solo si tipo === "texto". */
  color_fondo: string | null;
  /** Fuente tipografica del cartelito, solo si tipo === "texto". */
  fuente: string | null;
  created_at: string;
}

export type NuevoSticker = Omit<Sticker, "id" | "created_at">;

/** Fuentes disponibles para los cartelitos de texto (Google Fonts, gratis). */
export const FUENTES_CARTELITO = [
  { valor: "'Permanent Marker', cursive", etiqueta: "Marcador" },
  { valor: "'Caveat', cursive", etiqueta: "Manuscrita" },
  { valor: "'Bangers', cursive", etiqueta: "Comic" },
  { valor: "'VT323', monospace", etiqueta: "Terminal" },
  { valor: "'Archivo Black', sans-serif", etiqueta: "Impacto" },
] as const;
