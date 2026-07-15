"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Pause, Play, ScanLine, Heart, Brush } from "lucide-react";
import type { Sticker, Tablero } from "@/lib/types";
import { useLienzo } from "@/lib/useLienzo";
import { useTema } from "@/lib/TemaContext";
import BarraCreacion from "./BarraCreacion";
import ModalEliminar from "./ModalEliminar";
import TarjetaSticker from "./TarjetaSticker";
import CapaDibujo from "./CapaDibujo";

interface VistaPresentacionProps {
  tablero: Tablero | null;
  onPaletaChange?: (colores: string[], etiqueta: string) => void;
}

const SEGUNDOS_POR_DIAPOSITIVA = 4;

/** Modo "Presentacion": recorrido automatico tipo diapositivas por todos los recuerdos. */
export default function VistaPresentacion({ tablero, onPaletaChange }: VistaPresentacionProps) {
  const tema = useTema();
  const {
    stickers, cargando, subiendo, subirArchivoComoSticker, crearCartelitoTexto,
    generarConIA, eliminarSticker, cambiarFiltro, alternarFavorito, todosLosColores, estadoAnimo,
  } = useLienzo(tablero);

  const [stickerAEliminar, setStickerAEliminar] = useState<Sticker | null>(null);
  const [soloFavoritos, setSoloFavoritos] = useState(false);
  const [modoDibujo, setModoDibujo] = useState(false);
  const [indice, setIndice] = useState(0);
  const [reproduciendo, setReproduciendo] = useState(true);
  const [mostrarBarra, setMostrarBarra] = useState(false);

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

  const estiloEtiqueta = {
    backgroundColor: `${tema.superficie}dd`,
    color: tema.textoSuave,
    borderRadius: tema.bordeRadio / 3,
  };
  const estiloBotonRedondo = {
    backgroundColor: tema.superficie,
    color: tema.texto,
    borderRadius: "9999px",
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

  const actual = ordenados[indice];

  return (
    <div className="relative flex h-full flex-1 flex-col overflow-hidden" style={{ backgroundColor: tema.fondo }}>
      {tablero.dibujo_url && !modoDibujo && (
        <img
          src={tablero.dibujo_url}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
      )}

      <div
        className="pointer-events-none absolute inset-0 opacity-30 transition-[background] duration-[1500ms]"
        style={{
          background: actual
            ? `radial-gradient(circle at 50% 40%, ${actual.dominant_color || estadoAnimo.primario} 0%, transparent 60%)`
            : undefined,
        }}
      />

      <div className="relative z-20 flex items-start justify-between gap-2 p-3 sm:p-4">
        <button onClick={() => setMostrarBarra((m) => !m)} className="px-2 py-1 text-[9px]" style={estiloEtiqueta}>
          {mostrarBarra ? "Ocultar herramientas" : "+ Agregar recuerdos"}
        </button>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            onClick={() => setModoDibujo((v) => !v)}
            aria-label={modoDibujo ? "Salir del modo dibujo" : "Dibujar sobre el lienzo"}
            className="flex items-center justify-center p-1.5"
            style={{
              backgroundColor: modoDibujo ? tema.acento : `${tema.superficie}dd`,
              color: modoDibujo ? tema.fondo : tema.textoSuave,
              borderRadius: tema.bordeRadio / 3,
            }}
          >
            <Brush className="h-3.5 w-3.5" />
          </button>
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
          <span className="px-2 py-1 text-[9px] sm:text-[10px]" style={estiloEtiqueta}>
            {tablero.nombre} · {ordenados.length > 0 ? indice + 1 : 0}/{ordenados.length}
          </span>
        </div>
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
        <div className="flex flex-1 items-center justify-center" style={{ color: tema.acentoSecundario }}>
          <ScanLine className="mr-2 h-4 w-4 animate-pulse" /> Cargando presentación...
        </div>
      )}

      {!cargando && ordenados.length === 0 && (
        <div className="flex flex-1 items-center justify-center px-6">
          <p className="max-w-xs px-6 py-8 text-center text-xs" style={{ color: tema.textoSuave, border: `2px dashed ${tema.textoSuave}33`, borderRadius: tema.bordeRadio }}>
            Agrega recuerdos para empezar la presentación.
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
                onAlternarFavorito={alternarFavorito}
                onEliminar={setStickerAEliminar}
              />
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIndice((i) => (i - 1 + ordenados.length) % ordenados.length)}
              className="flex h-9 w-9 items-center justify-center"
              style={estiloBotonRedondo}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setReproduciendo((r) => !r)}
              className="flex h-9 w-9 items-center justify-center"
              style={{ backgroundColor: tema.acento, color: tema.fondo, borderRadius: "9999px", boxShadow: tema.sombraChica }}
            >
              {reproduciendo ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <button
              onClick={() => setIndice((i) => (i + 1) % ordenados.length)}
              className="flex h-9 w-9 items-center justify-center"
              style={estiloBotonRedondo}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {modoDibujo && (
        <CapaDibujo tablero={tablero} overlay activo onCerrar={() => setModoDibujo(false)} />
      )}

      <ModalEliminar sticker={stickerAEliminar} onConfirmar={eliminarSticker} onCancelar={() => setStickerAEliminar(null)} />
    </div>
  );
}
