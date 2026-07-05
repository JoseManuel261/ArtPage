export type FilterType = "raw" | "hackeado" | "duotone";

export interface Tablero {
  id: string;
  nombre: string;
  created_at: string;
}

export interface Sticker {
  id: string;
  tablero_id: string;
  image_url: string;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  filter_type: FilterType;
  z_index: number;
  created_at: string;
}

export type NuevoSticker = Omit<Sticker, "id" | "created_at">;
