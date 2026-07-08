"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, ScanLine } from "lucide-react";
import type { Sticker, Tablero } from "@/lib/types";
import { useLienzo } from "@/lib/useLienzo";
import BarraCreacion from "./BarraCreacion";
import ModalEliminar from "./ModalEliminar";
import TarjetaSticker from "./TarjetaSticker";

interface VistaAlbumProps {
  tablero: Tablero | null;
  onPaletaChange?: (colores: string[], etiqueta: string) => void;
}

const POR_PAGINA = 2;

/** Modo "Album": los recuerdos se agrupan en paginas que se voltean, como un libro. */
export default function VistaAlbum({ tablero, onPaletaChange }: VistaAlbumProps) {
  const {
    stickers, cargando, subiendo, subirArchivoComoSticker, crearCartelitoTexto,
    generarConIA, eliminarSticker, cambiarFiltro, todosLosColores, estadoAnimo,
  } = useLienzo(tablero);

  const [stickerAEliminar, setStickerAEliminar] = useState<Sticker | null>(null);
  const [pagina, setPagina] = useState(0);
  const [direccion, setDireccion] = useState(1);

  useMemo(() => {
    onPaletaChange?.(todosLosColores, estadoAnimo.etiqueta);
  }, [todosLosColores, estadoAnimo.etiqueta]);

  const ordenados = useMemo(
    () => [...stickers].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    [stickers]
  );

  const totalPaginas = Math.max(1, Math.ceil(ordenados.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas - 1);
  const itemsPagina = ordenados.slice(paginaActual * POR_PAGINA, paginaActual * POR_PAGINA + POR_PAGINA);

  function irPagina(nueva: number) {
    if (nueva < 0 || nueva > totalPaginas - 1) return;
    setDireccion(nueva > paginaActual ? 1 : -1);
    setPagina(nueva);
  }

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
          {tablero.nombre}
        </span>
      </div>

      {cargando && (
        <div className="flex flex-1 items-center justify-center font-mono text-punk-cyan">
          <ScanLine className="mr-2 h-4 w-4 animate-pulse" /> cargando_album...
        </div>
      )}

      {!cargando && ordenados.length === 0 && (
        <div className="flex flex-1 items-center justify-center px-6">
          <p className="max-w-xs border-4 border-dashed border-punk-paper/20 bg-black/40 px-6 py-8 text-center font-mono text-xs text-punk-paper/40">
            este album aun no tiene paginas_
          </p>
        </div>
      )}

      {!cargando && ordenados.length > 0 && (
        <div className="relative z-10 flex flex-1 items-center justify-center gap-4 px-4" style={{ perspective: 1400 }}>
          <button
            onClick={() => irPagina(paginaActual - 1)}
            disabled={paginaActual === 0}
            className="flex h-10 w-10 shrink-0 items-center justify-center border-4 border-black bg-punk-paper text-black shadow-[3px_3px_0px_#000] disabled:opacity-20"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="relative flex h-[70%] w-full max-w-xl items-center justify-center overflow-hidden border-4 border-black bg-neutral-900 shadow-[8px_8px_0px_#000]">
            <AnimatePresence mode="wait" custom={direccion}>
              <motion.div
                key={paginaActual}
                custom={direccion}
                initial={{ rotateY: direccion > 0 ? 90 : -90, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                exit={{ rotateY: direccion > 0 ? -90 : 90, opacity: 0 }}
                transition={{ duration: 0.45, ease: "easeInOut" }}
                style={{ transformStyle: "preserve-3d" }}
                className="flex h-full w-full flex-wrap items-center justify-center gap-6 p-6"
              >
                {itemsPagina.map((sticker) => (
                  <TarjetaSticker
                    key={sticker.id}
                    sticker={sticker}
                    colorGlow={sticker.dominant_color || estadoAnimo.primario}
                    tamano="grande"
                    onCambiarFiltro={cambiarFiltro}
                    onEliminar={setStickerAEliminar}
                  />
                ))}
              </motion.div>
            </AnimatePresence>
          </div>

          <button
            onClick={() => irPagina(paginaActual + 1)}
            disabled={paginaActual >= totalPaginas - 1}
            className="flex h-10 w-10 shrink-0 items-center justify-center border-4 border-black bg-punk-paper text-black shadow-[3px_3px_0px_#000] disabled:opacity-20"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}

      {!cargando && ordenados.length > 0 && (
        <p className="relative z-10 pb-3 text-center font-mono text-[10px] text-punk-paper/50">
          pagina {paginaActual + 1} / {totalPaginas}
        </p>
      )}

      <ModalEliminar sticker={stickerAEliminar} onConfirmar={eliminarSticker} onCancelar={() => setStickerAEliminar(null)} />
    </div>
  );
}
