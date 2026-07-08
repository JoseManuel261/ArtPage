"use client";

import { useMemo, useState } from "react";
import { ScanLine } from "lucide-react";
import type { Sticker, Tablero } from "@/lib/types";
import { useLienzo } from "@/lib/useLienzo";
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
  const {
    stickers, cargando, subiendo, subirArchivoComoSticker, crearCartelitoTexto,
    generarConIA, eliminarSticker, cambiarFiltro, todosLosColores, estadoAnimo,
  } = useLienzo(tablero);

  const [stickerAEliminar, setStickerAEliminar] = useState<Sticker | null>(null);

  useMemo(() => {
    onPaletaChange?.(todosLosColores, estadoAnimo.etiqueta);
  }, [todosLosColores, estadoAnimo.etiqueta]);

  const ordenados = useMemo(
    () => [...stickers].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    [stickers]
  );

  if (!tablero) {
    return (
      <div className="flex h-full flex-1 items-center justify-center bg-punk-black">
        <p className="mx-4 border-4 border-dashed border-punk-pink/40 px-6 py-6 text-center font-mono text-sm text-punk-paper/50">
          &gt; selecciona o crea un tablero_
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-1 flex-col overflow-hidden bg-punk-black">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:32px_32px]" />

      <div className="relative z-20 flex items-start justify-between gap-2 p-3 sm:p-4">
        <BarraCreacion
          subiendo={subiendo}
          colorPrimario={estadoAnimo.primario}
          colorSecundario={estadoAnimo.secundario}
          onSubirArchivos={(files) => files.forEach(subirArchivoComoSticker)}
          onGenerarIA={generarConIA}
          onCrearTexto={crearCartelitoTexto}
        />
        <span className="shrink-0 border-2 border-punk-paper/20 bg-black/70 px-2 py-1 font-mono text-[9px] text-punk-paper/60 sm:text-[10px]">
          {tablero.nombre} // {ordenados.length} recuerdos
        </span>
      </div>

      {cargando && (
        <div className="flex flex-1 items-center justify-center font-mono text-punk-cyan">
          <ScanLine className="mr-2 h-4 w-4 animate-pulse" /> cargando_linea_de_tiempo...
        </div>
      )}

      {!cargando && ordenados.length === 0 && (
        <div className="flex flex-1 items-center justify-center px-6">
          <p className="max-w-xs border-4 border-dashed border-punk-paper/20 bg-black/40 px-6 py-8 text-center font-mono text-xs text-punk-paper/40">
            aun no hay recuerdos en esta linea de tiempo_
          </p>
        </div>
      )}

      {!cargando && ordenados.length > 0 && (
        <div className="relative z-10 flex-1 overflow-x-auto overflow-y-hidden px-8 py-6 sm:px-16">
          <div className="relative flex h-full min-w-max items-center gap-10 sm:gap-16">
            <div
              className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2"
              style={{ background: `linear-gradient(90deg, ${estadoAnimo.primario}, ${estadoAnimo.secundario})` }}
            />
            {ordenados.map((sticker, i) => (
              <div
                key={sticker.id}
                className={`relative flex flex-col items-center gap-2 ${i % 2 === 0 ? "-translate-y-10" : "translate-y-10"}`}
              >
                <div
                  className="h-3 w-3 rounded-full border-2 border-black"
                  style={{ backgroundColor: sticker.dominant_color || estadoAnimo.primario }}
                />
                <TarjetaSticker
                  sticker={sticker}
                  colorGlow={sticker.dominant_color || estadoAnimo.primario}
                  onCambiarFiltro={cambiarFiltro}
                  onEliminar={setStickerAEliminar}
                />
                <span className="whitespace-nowrap font-mono text-[9px] text-punk-paper/50">
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
