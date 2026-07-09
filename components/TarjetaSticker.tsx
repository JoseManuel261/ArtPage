"use client";

import { Heart, Wand2, X } from "lucide-react";
import type { FilterType, Sticker } from "@/lib/types";
import { FUENTES_CARTELITO } from "@/lib/types";
import { hexToHsl } from "@/lib/colorAnalysis";
import { useTema } from "@/lib/TemaContext";

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
  onAlternarFavorito?: (sticker: Sticker) => void;
  mostrarAcciones?: boolean;
}

/**
 * Renderiza UN sticker (foto o cartelito de texto) con el look del
 * tema visual activo: borde/sombra/radio segun el tema, brillo de
 * color propio de la imagen. Los botones de accion son opcionales.
 */
export default function TarjetaSticker({
  sticker,
  colorGlow,
  tamano = "normal",
  onCambiarFiltro,
  onEliminar,
  onAlternarFavorito,
  mostrarAcciones = true,
}: TarjetaStickerProps) {
  const tema = useTema();
  const dimImagen = tamano === "grande" ? "h-40 w-40 sm:h-56 sm:w-56" : "h-24 w-24 sm:h-32 sm:w-32";
  const dimTexto = tamano === "grande" ? "h-40 w-52 sm:h-56 sm:w-72" : "h-32 w-40 sm:h-40 sm:w-56";

  const bordeMarco = tema.efectosRetro ? "#ffffff" : tema.superficie;
  const sombraCompleta = tema.efectosRetro
    ? `${tema.sombra}, 0 0 26px -2px ${colorGlow}`
    : `${tema.sombra}, 0 0 20px -6px ${colorGlow}`;

  return (
    <div className="group relative inline-block select-none">
      {sticker.tipo === "texto" ? (
        <div
          className={`flex items-center justify-center p-3 text-center ${dimTexto}`}
          style={{
            backgroundColor: sticker.color_fondo || "#fff4d6",
            color: colorTextoLegible(sticker.color_fondo || "#fff4d6"),
            fontFamily: sticker.fuente || FUENTES_CARTELITO[0].valor,
            border: `${tema.bordeGrosor}px solid ${bordeMarco}`,
            borderRadius: tema.bordeRadio,
            boxShadow: sombraCompleta,
          }}
        >
          <p className="line-clamp-6 text-base leading-snug sm:text-xl">{sticker.texto}</p>
        </div>
      ) : (
        <img
          src={sticker.image_url}
          alt="sticker"
          draggable={false}
          className={`object-cover ${dimImagen} ${FILTER_CLASSES[sticker.filter_type]}`}
          style={{
            border: `${tema.bordeGrosor}px solid ${bordeMarco}`,
            borderRadius: tema.bordeRadio,
            boxShadow: sombraCompleta,
            filter: sticker.filter_type === "duotone" ? "url(#glitch-duotone)" : undefined,
          }}
        />
      )}

      {onAlternarFavorito && (
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onAlternarFavorito(sticker);
          }}
          className={`absolute -left-2 -top-2 z-10 flex h-6 w-6 items-center justify-center transition-opacity ${
            sticker.favorito ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
          style={{
            border: `2px solid ${tema.efectosRetro ? "#000" : "transparent"}`,
            borderRadius: tema.bordeRadio / 3,
            backgroundColor: sticker.favorito ? tema.acento : `${tema.superficie}dd`,
            color: sticker.favorito ? tema.fondo : tema.textoSuave,
            boxShadow: tema.sombraChica,
          }}
          aria-label={sticker.favorito ? "Quitar de favoritos" : "Marcar como favorito"}
        >
          <Heart className="h-3.5 w-3.5" fill={sticker.favorito ? "currentColor" : "none"} />
        </button>
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
              className="flex h-6 items-center gap-0.5 px-1 text-[8px] font-bold"
              style={{
                border: `2px solid ${tema.efectosRetro ? "#000" : "transparent"}`,
                borderRadius: tema.bordeRadio / 3,
                backgroundColor: tema.acentoSecundario,
                color: tema.fondo,
                boxShadow: tema.sombraChica,
              }}
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
              className="flex h-6 w-6 items-center justify-center"
              style={{
                border: `2px solid ${tema.efectosRetro ? "#000" : "transparent"}`,
                borderRadius: tema.bordeRadio / 3,
                backgroundColor: tema.superficie,
                color: tema.texto,
                boxShadow: tema.sombraChica,
              }}
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
