"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Pause, Play, ScanLine } from "lucide-react";
import type { Sticker, Tablero } from "@/lib/types";
import { useLienzo } from "@/lib/useLienzo";
import BarraCreacion from "./BarraCreacion";
import ModalEliminar from "./ModalEliminar";
import TarjetaSticker from "./TarjetaSticker";

interface VistaPresentacionProps {
  tablero: Tablero | null;
  onPaletaChange?: (colores: string[], etiqueta: string) => void;
}

const SEGUNDOS_POR_DIAPOSITIVA = 4;

/** Modo "Presentacion": recorrido automatico tipo diapositivas por todos los recuerdos. */
export default function VistaPresentacion({ tablero, onPaletaChange }: VistaPresentacionProps) {
  const {
    stickers, cargando, subiendo, subirArchivoComoSticker, crearCartelitoTexto,
    generarConIA, eliminarSticker, cambiarFiltro, todosLosColores, estadoAnimo,
  } = useLienzo(tablero);

  const [stickerAEliminar, setStickerAEliminar] = useState<Sticker | null>(null);
  const [indice, setIndice] = useState(0);
  const [reproduciendo, setReproduciendo] = useState(true);
  const [mostrarBarra, setMostrarBarra] = useState(false);

  useMemo(() => {
    onPaletaChange?.(todosLosColores, estadoAnimo.etiqueta);
  }, [todosLosColores, estadoAnimo.etiqueta]);

  const ordenados = useMemo(
    () => [...stickers].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    [stickers]
  );

  useEffect(() => {
    if (!reproduciendo || ordenados.length === 0) return;
    const id = setInterval(() => {
      setIndice((i) => (i + 1) % ordenados.length);
    }, SEGUNDOS_POR_DIAPOSITIVA * 1000);
    return () => clearInterval(id);
  }, [reproduciendo, ordenados.length]);

  useEffect(() => {
    if (indice >= ordenados.length) setIndice(0);
  }, [ordenados.length, indice]);

  if (!tablero) {
    return (
      <div className="flex h-full flex-1 items-center justify-center bg-punk-black">
        <p className="mx-4 border-4 border-dashed border-punk-pink/40 px-6 py-6 text-center font-mono text-sm text-punk-paper/50">
          &gt; selecciona o crea un tablero_
        </p>
      </div>
    );
  }

  const actual = ordenados[indice];

  return (
    <div className="relative flex h-full flex-1 flex-col overflow-hidden bg-punk-black">
      <div
        className="pointer-events-none absolute inset-0 opacity-30 transition-[background] duration-[1500ms]"
        style={{
          background: actual
            ? `radial-gradient(circle at 50% 40%, ${actual.dominant_color || estadoAnimo.primario} 0%, transparent 60%)`
            : undefined,
        }}
      />

      <div className="relative z-20 flex items-start justify-between gap-2 p-3 sm:p-4">
        <button
          onClick={() => setMostrarBarra((m) => !m)}
          className="border-2 border-punk-paper/30 bg-black/70 px-2 py-1 font-mono text-[9px] text-punk-paper/60"
        >
          {mostrarBarra ? "ocultar herramientas" : "+ agregar recuerdos"}
        </button>
        <span className="shrink-0 border-2 border-punk-paper/20 bg-black/70 px-2 py-1 font-mono text-[9px] text-punk-paper/60 sm:text-[10px]">
          {tablero.nombre} // {ordenados.length > 0 ? indice + 1 : 0}/{ordenados.length}
        </span>
      </div>

      {mostrarBarra && (
        <div className="relative z-20 px-3 pb-2 sm:px-4">
          <BarraCreacion
            subiendo={subiendo}
            colorPrimario={estadoAnimo.primario}
            colorSecundario={estadoAnimo.secundario}
            onSubirArchivos={(files) => files.forEach(subirArchivoComoSticker)}
            onGenerarIA={generarConIA}
            onCrearTexto={crearCartelitoTexto}
          />
        </div>
      )}

      {cargando && (
        <div className="flex flex-1 items-center justify-center font-mono text-punk-cyan">
          <ScanLine className="mr-2 h-4 w-4 animate-pulse" /> cargando_presentacion...
        </div>
      )}

      {!cargando && ordenados.length === 0 && (
        <div className="flex flex-1 items-center justify-center px-6">
          <p className="max-w-xs border-4 border-dashed border-punk-paper/20 bg-black/40 px-6 py-8 text-center font-mono text-xs text-punk-paper/40">
            agrega recuerdos para empezar la presentacion_
          </p>
        </div>
      )}

      {!cargando && actual && (
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-6 px-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={actual.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
            >
              <TarjetaSticker
                sticker={actual}
                colorGlow={actual.dominant_color || estadoAnimo.primario}
                tamano="grande"
                onCambiarFiltro={cambiarFiltro}
                onEliminar={setStickerAEliminar}
              />
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIndice((i) => (i - 1 + ordenados.length) % ordenados.length)}
              className="flex h-9 w-9 items-center justify-center border-2 border-black bg-punk-paper text-black shadow-[2px_2px_0px_#000]"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setReproduciendo((r) => !r)}
              className="flex h-9 w-9 items-center justify-center border-2 border-black bg-punk-pink text-black shadow-[2px_2px_0px_#000]"
            >
              {reproduciendo ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <button
              onClick={() => setIndice((i) => (i + 1) % ordenados.length)}
              className="flex h-9 w-9 items-center justify-center border-2 border-black bg-punk-paper text-black shadow-[2px_2px_0px_#000]"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <ModalEliminar sticker={stickerAEliminar} onConfirmar={eliminarSticker} onCancelar={() => setStickerAEliminar(null)} />
    </div>
  );
}
