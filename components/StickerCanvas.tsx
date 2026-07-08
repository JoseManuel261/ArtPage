"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScanLine, Palette, Download, Volume2, VolumeX, Loader2 } from "lucide-react";
import type { Sticker, Tablero } from "@/lib/types";
import { useLienzo } from "@/lib/useLienzo";
import { exportarLienzoComoPng } from "@/lib/exportarLienzo";
import { sonidoActivo } from "@/lib/sonido";
import BarraCreacion from "./BarraCreacion";
import ModalEliminar from "./ModalEliminar";
import TarjetaSticker from "./TarjetaSticker";

interface StickerCanvasProps {
  tablero: Tablero | null;
  onPaletaChange?: (colores: string[], etiqueta: string) => void;
}

const ESCALA_MIN = 0.5;
const ESCALA_MAX = 2.2;

const posicionesAurora = [
  { top: "8%", left: "10%" },
  { top: "70%", left: "78%" },
  { top: "20%", left: "85%" },
  { top: "82%", left: "15%" },
  { top: "45%", left: "45%" },
];
const posicionesEco = [
  { top: "5%", left: "5%" },
  { top: "55%", left: "68%" },
  { top: "72%", left: "8%" },
  { top: "10%", left: "62%" },
  { top: "38%", left: "32%" },
];

/** Modo "Collage libre": arrastrar, rotar, redimensionar cualquier sticker por el lienzo. */
export default function StickerCanvas({ tablero, onPaletaChange }: StickerCanvasProps) {
  const {
    stickers,
    cargando,
    subiendo,
    subirArchivoComoSticker,
    crearCartelitoTexto,
    generarConIA,
    eliminarSticker,
    traerAlFrente,
    actualizarPosicion,
    cambiarFiltro,
    actualizarEscala,
    todosLosColores,
    estadoAnimo,
    coloresAurora,
  } = useLienzo(tablero);

  const [arrastrandoArchivo, setArrastrandoArchivo] = useState(false);
  const [stickerAEliminar, setStickerAEliminar] = useState<Sticker | null>(null);
  const [exportando, setExportando] = useState(false);
  const [sonidoOn, setSonidoOn] = useState(() => sonidoActivo.get());

  const ecos = useMemo(() => stickers.filter((s) => s.tipo === "imagen").slice(-5), [stickers]);

  useMemo(() => {
    onPaletaChange?.(todosLosColores, estadoAnimo.etiqueta);
  }, [todosLosColores, estadoAnimo.etiqueta]);

  const estiloAmbiente = {
    "--mood-primary": estadoAnimo.primario,
    "--mood-secondary": estadoAnimo.secundario,
    "--mood-glow": estadoAnimo.glow,
  } as React.CSSProperties;

  async function handleExportar() {
    if (!tablero || stickers.length === 0) return;
    setExportando(true);
    try {
      await exportarLienzoComoPng(stickers, tablero.nombre);
    } finally {
      setExportando(false);
    }
  }

  function alternarSonido() {
    const nuevo = !sonidoOn;
    setSonidoOn(nuevo);
    sonidoActivo.set(nuevo);
  }

  function handleWheelSticker(e: React.WheelEvent, sticker: Sticker) {
    e.preventDefault();
    e.stopPropagation();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    const nueva = Math.min(ESCALA_MAX, Math.max(ESCALA_MIN, sticker.scale + delta));
    actualizarEscala(sticker, nueva);
  }

  if (!tablero) {
    return (
      <div className="flex h-full flex-1 items-center justify-center bg-punk-black">
        <p className="mx-4 border-4 border-dashed border-punk-pink/40 px-6 py-6 text-center font-mono text-sm text-punk-paper/50 sm:px-8">
          &gt; selecciona o crea un tablero para empezar a intervenir_
        </p>
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setArrastrandoArchivo(true);
      }}
      onDragLeave={() => setArrastrandoArchivo(false)}
      onDrop={(e) => {
        e.preventDefault();
        setArrastrandoArchivo(false);
        if (e.dataTransfer.files) Array.from(e.dataTransfer.files).forEach(subirArchivoComoSticker);
      }}
      style={estiloAmbiente}
      className="art-canvas relative h-full flex-1 overflow-hidden bg-punk-black"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {ecos.map((s, i) => {
          const pos = posicionesEco[i % posicionesEco.length];
          return (
            <img
              key={`eco-${s.id}`}
              src={s.image_url}
              alt=""
              aria-hidden="true"
              className="eco-flotante absolute h-64 w-64 rounded-full object-cover opacity-[0.28] blur-3xl mix-blend-screen"
              style={{ top: pos.top, left: pos.left, animationDelay: `${i * 2.4}s`, animationDuration: `${18 + i * 3}s` }}
            />
          );
        })}
      </div>

      <div className="pointer-events-none absolute inset-0 opacity-[0.55]">
        {coloresAurora.map((color, i) => {
          const pos = posicionesAurora[i % posicionesAurora.length];
          return (
            <div
              key={`aurora-${i}-${color}`}
              className="aurora-blob absolute rounded-full blur-3xl"
              style={{ top: pos.top, left: pos.left, width: 380, height: 380, background: color, animationDelay: `${i * 1.8}s` }}
            />
          );
        })}
      </div>

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:32px_32px]" />

      <div className="pointer-events-none absolute left-2 top-2 z-20 flex max-w-[85%] flex-col gap-2 sm:left-4 sm:top-4 sm:max-w-[65%]">
        <BarraCreacion
          subiendo={subiendo}
          colorPrimario={estadoAnimo.primario}
          colorSecundario={estadoAnimo.secundario}
          onSubirArchivos={(files) => files.forEach(subirArchivoComoSticker)}
          onGenerarIA={generarConIA}
          onCrearTexto={crearCartelitoTexto}
        />
        <span className="pointer-events-auto w-fit max-w-full truncate border-2 border-punk-paper/20 bg-black/70 px-2 py-1 font-mono text-[9px] text-punk-paper/60 sm:text-[10px]">
          arrastra imagenes aqui // {tablero.nombre}
        </span>
      </div>

      <div className="pointer-events-auto absolute right-2 top-2 z-20 flex flex-col items-end gap-1.5 sm:right-4 sm:top-4">
        <div className="flex items-center gap-1.5 border-2 border-black bg-black/70 px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-punk-paper/70 sm:text-[10px]">
          <Palette className="h-3 w-3 shrink-0" style={{ color: estadoAnimo.primario }} />
          <span className="hidden sm:inline">paleta:</span>
          <span style={{ color: estadoAnimo.primario }}>{estadoAnimo.etiqueta}</span>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={alternarSonido}
            aria-label={sonidoOn ? "Silenciar sonido" : "Activar sonido"}
            className="flex items-center justify-center border-2 border-black bg-black/70 p-1.5 text-punk-paper/70 hover:text-punk-paper"
          >
            {sonidoOn ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={handleExportar}
            disabled={exportando || stickers.length === 0}
            className="flex items-center gap-1 border-2 border-black bg-black/70 px-2 py-1.5 font-mono text-[9px] text-punk-paper/70 hover:text-punk-paper disabled:opacity-30 sm:text-[10px]"
          >
            {exportando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">guardar.png</span>
          </button>
        </div>
      </div>

      {arrastrandoArchivo && (
        <div className="pointer-events-none absolute inset-2 z-10 border-4 border-dashed sm:inset-4" style={{ borderColor: estadoAnimo.secundario }} />
      )}

      {cargando && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 font-mono text-punk-cyan">
          <ScanLine className="mr-2 h-4 w-4 animate-pulse" />
          cargando_lienzo...
        </div>
      )}

      {!cargando && stickers.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6">
          <p className="max-w-xs border-4 border-dashed border-punk-paper/20 bg-black/40 px-6 py-8 text-center font-mono text-xs text-punk-paper/40">
            lienzo vacio_
            <br />
            arrastra una imagen, genera algo con IA, o añade un cartelito
          </p>
        </div>
      )}

      <AnimatePresence>
        {stickers.map((sticker) => (
          <motion.div
            key={sticker.id}
            drag
            dragMomentum={false}
            onPointerDown={() => traerAlFrente(sticker.id)}
            onDragEnd={(_, info) => actualizarPosicion(sticker, sticker.x + info.offset.x, sticker.y + info.offset.y)}
            onWheel={(e) => handleWheelSticker(e, sticker)}
            initial={{ x: sticker.x, y: sticker.y, rotate: sticker.rotation, scale: 0.6, opacity: 0 }}
            animate={{ x: sticker.x, y: sticker.y, rotate: sticker.rotation, scale: sticker.scale, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0, transition: { duration: 0.2 } }}
            whileDrag={{ scale: sticker.scale * 1.08, cursor: "grabbing" }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            style={{ position: "absolute", zIndex: sticker.z_index, top: 0, left: 0 }}
            className="cursor-grab touch-none"
          >
            <TarjetaSticker
              sticker={sticker}
              colorGlow={sticker.dominant_color || estadoAnimo.primario}
              onCambiarFiltro={cambiarFiltro}
              onEliminar={setStickerAEliminar}
            />
          </motion.div>
        ))}
      </AnimatePresence>

      <ModalEliminar sticker={stickerAEliminar} onConfirmar={eliminarSticker} onCancelar={() => setStickerAEliminar(null)} />

      <style jsx>{`
        .eco-flotante {
          animation-name: flotar-eco;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
          animation-direction: alternate;
        }
        .aurora-blob {
          animation-name: flotar-aurora;
          animation-duration: 14s;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
          animation-direction: alternate;
        }
        @keyframes flotar-eco {
          0% { transform: translate(0, 0) scale(1); }
          100% { transform: translate(40px, -30px) scale(1.15); }
        }
        @keyframes flotar-aurora {
          0% { transform: translate(0, 0) scale(1); }
          100% { transform: translate(-30px, 25px) scale(1.2); }
        }
      `}</style>
    </div>
  );
}
