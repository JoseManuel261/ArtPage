export type FilterType = "raw" | "hackeado" | "duotone";

/** "imagen": foto subida o generada con IA. "texto": cartelito de texto. */
export type TipoSticker = "imagen" | "texto";

/** Los 5 "formatos" de interfaz que puede tener un tablero. */
export type ModoTablero = "collage" | "album" | "timeline" | "presentacion" | "constelacion" | "dibujo";

/** Temas visuales, cada uno con su propia paleta/tipografia/textura. */
export type TemaVisual = "minimal" | "neon" | "scrapbook" | "pastel";

export interface Tablero {
  id: string;
  nombre: string;
  modo: ModoTablero;
  tema_visual: TemaVisual;
  /** Si tiene fecha futura, el tablero queda bloqueado hasta entonces. */
  fecha_revelacion: string | null;
  /** Mensaje personal que se revela al abrir el tablero (opcional). */
  dedicatoria: string | null;
  /** URL publica del PNG guardado del modo Dibujo, si se ha usado. */
  dibujo_url: string | null;
  /** Fondo ambiental generado con IA, basado en la paleta detectada. */
  fondo_ia_url: string | null;
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
  dominant_color: string | null;
  palette: string[] | null;
  texto: string | null;
  color_fondo: string | null;
  fuente: string | null;
  favorito: boolean;
  created_at: string;
}

export type NuevoSticker = Omit<Sticker, "id" | "created_at">;

export const FUENTES_CARTELITO: { valor: string; etiqueta: string }[] = [
  { valor: "'Permanent Marker', cursive", etiqueta: "Marcador" },
  { valor: "'Caveat', cursive", etiqueta: "Manuscrita" },
  { valor: "'Bangers', cursive", etiqueta: "Comic" },
  { valor: "'VT323', monospace", etiqueta: "Terminal" },
  { valor: "'Archivo Black', sans-serif", etiqueta: "Impacto" },
];

export const MODOS_TABLERO: { valor: ModoTablero; etiqueta: string; descripcion: string }[] = [
  { valor: "collage", etiqueta: "Collage libre", descripcion: "Arrastra y superpone, como un corcho de fotos" },
  { valor: "album", etiqueta: "Álbum", descripcion: "Páginas que se voltean, como un libro de recuerdos" },
  { valor: "timeline", etiqueta: "Línea de tiempo", descripcion: "Todo ordenado cronológicamente" },
  { valor: "presentacion", etiqueta: "Presentación", descripcion: "Recorrido automático tipo diapositivas" },
  { valor: "constelacion", etiqueta: "Constelación", descripcion: "Recuerdos conectados como un mapa mental" },
  { valor: "dibujo", etiqueta: "Dibujo", descripcion: "Un lienzo en blanco para dibujar libremente" },
];

export const TEMAS_VISUALES: { valor: TemaVisual; etiqueta: string }[] = [
  { valor: "minimal", etiqueta: "Minimalista" },
  { valor: "neon", etiqueta: "Neón / Glitch" },
  { valor: "scrapbook", etiqueta: "Scrapbook vintage" },
  { valor: "pastel", etiqueta: "Pastel suave" },
];
