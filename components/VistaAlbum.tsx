"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, ScanLine, Heart } from "lucide-react";
import type { Sticker, Tablero } from "@/lib/types";
import { useLienzo } from "@/lib/useLienzo";
import { useTema } from "@/lib/TemaContext";
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
  const tema = useTema();
  const {
    stickers, cargando, subiendo, subirArchivoComoSticker, crearCartelitoTexto,
    generarConIA, eliminarSticker, cambiarFiltro, alternarFavorito, todosLosColores, estadoAnimo,
  } = useLienzo(tablero);

  const [stickerAEliminar, setStickerAEliminar] = useState<Sticker | null>(null);
  const [soloFavoritos, setSoloFavoritos] = useState(false);
  const [pagina, setPagina] = useState(0);
  const [direccion, setDireccion] = useState(1);

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

  const totalPaginas = Math.max(1, Math.ceil(ordenados.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas - 1);
  const itemsPagina = ordenados.slice(paginaActual * POR_PAGINA, paginaActual * POR_PAGINA + POR_PAGINA);

  function irPagina(nueva: number) {
    if (nueva < 0 || nueva > totalPaginas - 1) return;
    setDireccion(nueva > paginaActual ? 1 : -1);
    setPagina(nueva);
  }

  const estiloBotonNav = {
    backgroundColor: tema.superficie,
    color: tema.texto,
    borderRadius: tema.bordeRadio / 2,
    boxShadow: tema.sombraChica,
  };

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
          {tablero.nombre}
        </span>
        </div>
      </div>

      {cargando && (
        <div className="flex flex-1 items-center justify-center" style={{ color: tema.acentoSecundario }}>
          <ScanLine className="mr-2 h-4 w-4 animate-pulse" /> Cargando álbum...
        </div>
      )}

      {!cargando && ordenados.length === 0 && (
        <div className="flex flex-1 items-center justify-center px-6">
          <p className="max-w-xs px-6 py-8 text-center text-xs" style={{ color: tema.textoSuave, border: `2px dashed ${tema.textoSuave}33`, borderRadius: tema.bordeRadio }}>
            Este álbum aún no tiene páginas.
          </p>
        </div>
      )}

      {!cargando && ordenados.length > 0 && (
        <div className="relative z-10 flex flex-1 items-center justify-center gap-4 px-4" style={{ perspective: 1400 }}>
          <button
            onClick={() => irPagina(paginaActual - 1)}
            disabled={paginaActual === 0}
            className="flex h-10 w-10 shrink-0 items-center justify-center disabled:opacity-20"
            style={estiloBotonNav}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div
            className="relative flex h-[70%] w-full max-w-xl items-center justify-center overflow-hidden"
            style={{ backgroundColor: tema.superficie, borderRadius: tema.bordeRadio, boxShadow: tema.sombra }}
          >
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
                    onAlternarFavorito={alternarFavorito}
                    onEliminar={setStickerAEliminar}
                  />
                ))}
              </motion.div>
            </AnimatePresence>
          </div>

          <button
            onClick={() => irPagina(paginaActual + 1)}
            disabled={paginaActual >= totalPaginas - 1}
            className="flex h-10 w-10 shrink-0 items-center justify-center disabled:opacity-20"
            style={estiloBotonNav}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}

      {!cargando && ordenados.length > 0 && (
        <p className="relative z-10 pb-3 text-center text-[10px]" style={{ color: tema.textoSuave }}>
          Página {paginaActual + 1} / {totalPaginas}
        </p>
      )}

      <ModalEliminar sticker={stickerAEliminar} onConfirmar={eliminarSticker} onCancelar={() => setStickerAEliminar(null)} />
    </div>
  );
}
