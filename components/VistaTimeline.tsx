"use client";

import { useEffect, useMemo, useState } from "react";
import { ScanLine, Heart } from "lucide-react";
import type { Sticker, Tablero } from "@/lib/types";
import { useLienzo } from "@/lib/useLienzo";
import { useTema } from "@/lib/TemaContext";
import BarraCreacion from "./BarraCreacion";
import ModalEliminar from "./ModalEliminar";
import TarjetaSticker from "./TarjetaSticker";

interface VistaTimelineProps {
  tablero: Tablero | null;
  onPaletaChange?: (colores: string[], etiqueta: string) => void;
}

function fechaLegible(fecha: string) {
  return new Date(fecha).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" });
}

/** Modo "Linea de tiempo": todos los recuerdos ordenados cronologicamente. */
export default function VistaTimeline({ tablero, onPaletaChange }: VistaTimelineProps) {
  const tema = useTema();
  const {
    stickers, cargando, subiendo, subirArchivoComoSticker, crearCartelitoTexto,
    generarConIA, eliminarSticker, cambiarFiltro, alternarFavorito, todosLosColores, estadoAnimo,
  } = useLienzo(tablero);

  const [stickerAEliminar, setStickerAEliminar] = useState<Sticker | null>(null);
  const [soloFavoritos, setSoloFavoritos] = useState(false);

  useEffect(() => {
    onPaletaChange?.(todosLosColores, estadoAnimo.etiqueta);
  }, [todosLosColores, estadoAnimo.etiqueta, onPaletaChange]);

  const ordenados = useMemo(
    () =>
      [...stickers]
        .filter((s) => !soloFavoritos || s.favorito)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    [stickers, soloFavoritos]
  );

  if (!tablero) {
    return (
      <div className="flex h-full flex-1 items-center justify-center" style={{ backgroundColor: tema.fondo }}>
        <p className="mx-4 px-6 py-6 text-center text-sm" style={{ color: tema.textoSuave, border: `2px dashed ${tema.textoSuave}44`, borderRadius: tema.bordeRadio }}>
          Selecciona o crea un tablero.
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-1 flex-col overflow-hidden" style={{ backgroundColor: tema.fondo }}>
      {tema.efectosRetro && (
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:32px_32px]" />
      )}

      <div className="relative z-20 flex items-start justify-between gap-2 p-3 sm:p-4">
        <BarraCreacion
          subiendo={subiendo}
          colorPrimario={estadoAnimo.primario}
          colorSecundario={estadoAnimo.secundario}
          onSubirArchivos={(files) => files.forEach(subirArchivoComoSticker)}
          onGenerarIA={generarConIA}
          onCrearTexto={crearCartelitoTexto}
        />
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            onClick={() => setSoloFavoritos((v) => !v)}
            aria-label={soloFavoritos ? "Ver todos" : "Ver solo favoritos"}
            className="flex items-center justify-center p-1.5"
            style={{
              backgroundColor: soloFavoritos ? tema.acento : `${tema.superficie}dd`,
              color: soloFavoritos ? tema.fondo : tema.textoSuave,
              borderRadius: tema.bordeRadio / 3,
            }}
          >
            <Heart className="h-3.5 w-3.5" fill={soloFavoritos ? "currentColor" : "none"} />
          </button>
          <span
          className="px-2 py-1 text-[9px] sm:text-[10px]"
          style={{ backgroundColor: `${tema.superficie}dd`, color: tema.textoSuave, borderRadius: tema.bordeRadio / 3 }}
        >
          {tablero.nombre} · {ordenados.length} recuerdos
        </span>
        </div>
      </div>

      {cargando && (
        <div className="flex flex-1 items-center justify-center" style={{ color: tema.acentoSecundario }}>
          <ScanLine className="mr-2 h-4 w-4 animate-pulse" /> Cargando línea de tiempo...
        </div>
      )}

      {!cargando && ordenados.length === 0 && (
        <div className="flex flex-1 items-center justify-center px-6">
          <p
            className="max-w-xs px-6 py-8 text-center text-xs"
            style={{ color: tema.textoSuave, border: `2px dashed ${tema.textoSuave}33`, borderRadius: tema.bordeRadio }}
          >
            Aún no hay recuerdos en esta línea de tiempo.
          </p>
        </div>
      )}

      {!cargando && ordenados.length > 0 && (
        <div className="relative z-10 flex-1 overflow-x-auto overflow-y-hidden px-8 py-6 sm:px-16">
          <div className="relative flex h-full min-w-max items-center gap-10 sm:gap-16">
            <div
              className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2"
              style={{ background: `linear-gradient(90deg, ${estadoAnimo.primario}, ${estadoAnimo.secundario})`, borderRadius: tema.bordeRadio }}
            />
            {ordenados.map((sticker, i) => (
              <div
                key={sticker.id}
                className={`relative flex flex-col items-center gap-2 ${i % 2 === 0 ? "-translate-y-10" : "translate-y-10"}`}
              >
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: sticker.dominant_color || estadoAnimo.primario, border: `2px solid ${tema.fondo}` }}
                />
                <TarjetaSticker
                  sticker={sticker}
                  colorGlow={sticker.dominant_color || estadoAnimo.primario}
                  onCambiarFiltro={cambiarFiltro}
                  onAlternarFavorito={alternarFavorito}
                  onEliminar={setStickerAEliminar}
                />
                <span className="whitespace-nowrap text-[9px]" style={{ color: tema.textoSuave }}>
                  {fechaLegible(sticker.created_at)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <ModalEliminar sticker={stickerAEliminar} onConfirmar={eliminarSticker} onCancelar={() => setStickerAEliminar(null)} />
    </div>
  );
}
