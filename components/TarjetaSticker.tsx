"use client";

import { Wand2, X } from "lucide-react";
import type { FilterType, Sticker } from "@/lib/types";
import { FUENTES_CARTELITO } from "@/lib/types";
import { hexToHsl } from "@/lib/colorAnalysis";

const FILTER_CLASSES: Record<FilterType, string> = {
  raw: "",
  hackeado: "contrast-[250%] saturate-[200%] hue-rotate-[180deg] invert",
  duotone: "",
};

const ETIQUETA_FILTRO: Record<FilterType, string> = { raw: "RAW", hackeado: "HACK", duotone: "DUO" };

function colorTextoLegible(colorFondo: string): string {
  const { l } = hexToHsl(colorFondo);
  return l > 60 ? "#0a0a0a" : "#f4f0e6";
}

interface TarjetaStickerProps {
  sticker: Sticker;
  colorGlow: string;
  tamano?: "normal" | "grande";
  onCambiarFiltro?: (sticker: Sticker) => void;
  onEliminar?: (sticker: Sticker) => void;
  mostrarAcciones?: boolean;
}

/**
 * Renderiza UN sticker (foto o cartelito de texto) con su look
 * consistente en cualquier modo de interfaz: borde blanco grueso,
 * sombra + glow de color, filtro aplicado. Los botones de accion
 * (cambiar filtro / eliminar) son opcionales segun el modo lo permita.
 */
export default function TarjetaSticker({
  sticker,
  colorGlow,
  tamano = "normal",
  onCambiarFiltro,
  onEliminar,
  mostrarAcciones = true,
}: TarjetaStickerProps) {
  const dimImagen = tamano === "grande" ? "h-40 w-40 sm:h-56 sm:w-56" : "h-24 w-24 sm:h-32 sm:w-32";
  const dimTexto = tamano === "grande" ? "h-40 w-52 sm:h-56 sm:w-72" : "h-32 w-40 sm:h-40 sm:w-56";

  return (
    <div className="group relative inline-block select-none">
      {sticker.tipo === "texto" ? (
        <div
          className={`flex items-center justify-center border-4 border-white p-3 text-center ${dimTexto}`}
          style={{
            backgroundColor: sticker.color_fondo || "#fff4d6",
            color: colorTextoLegible(sticker.color_fondo || "#fff4d6"),
            fontFamily: sticker.fuente || FUENTES_CARTELITO[0].valor,
            boxShadow: `6px 6px 0px rgba(0,0,0,0.85), 0 0 26px -2px ${colorGlow}`,
          }}
        >
          <p className="line-clamp-6 text-base leading-snug sm:text-xl">{sticker.texto}</p>
        </div>
      ) : (
        <img
          src={sticker.image_url}
          alt="sticker"
          draggable={false}
          className={`border-4 border-white object-cover ${dimImagen} ${FILTER_CLASSES[sticker.filter_type]}`}
          style={{
            boxShadow: `6px 6px 0px rgba(0,0,0,0.85), 0 0 26px -2px ${colorGlow}`,
            filter: sticker.filter_type === "duotone" ? "url(#glitch-duotone)" : undefined,
          }}
        />
      )}

      {mostrarAcciones && (onCambiarFiltro || onEliminar) && (
        <div className="absolute -right-2 -top-2 z-10 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {sticker.tipo === "imagen" && onCambiarFiltro && (
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onCambiarFiltro(sticker);
              }}
              className="flex h-6 items-center gap-0.5 border-2 border-black bg-punk-cyan px-1 text-[8px] font-bold text-black shadow-[2px_2px_0px_#000]"
              title={`Filtro actual: ${ETIQUETA_FILTRO[sticker.filter_type]}`}
            >
              <Wand2 className="h-3 w-3" />
              {ETIQUETA_FILTRO[sticker.filter_type]}
            </button>
          )}
          {onEliminar && (
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onEliminar(sticker);
              }}
              className="flex h-6 w-6 items-center justify-center border-2 border-black bg-punk-paper text-black shadow-[2px_2px_0px_#000]"
              aria-label="Eliminar"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
