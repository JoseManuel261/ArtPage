"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Loader2, ScanLine, Palette, X } from "lucide-react";
import { supabase, STICKERS_BUCKET } from "@/lib/supabaseClient";
import type { FilterType, Sticker, Tablero } from "@/lib/types";
import {
  calcularEstadoAnimo,
  extraerPaletaDeArchivo,
  seleccionarColoresDestacados,
} from "@/lib/colorAnalysis";

interface StickerCanvasProps {
  tablero: Tablero | null;
  onPaletaChange?: (colores: string[], etiqueta: string) => void;
}

const FILTER_CLASSES: Record<FilterType, string> = {
  raw: "",
  hackeado: "contrast-[250%] saturate-[200%] hue-rotate-[180deg] invert",
  duotone: "",
};

function randomRotacionInicial() {
  return Math.random() * 30 - 15;
}

function rutaDesdeUrlPublica(url: string): string | null {
  const marcador = `/object/public/${STICKERS_BUCKET}/`;
  const idx = url.indexOf(marcador);
  if (idx === -1) return null;
  return decodeURIComponent(url.slice(idx + marcador.length));
}

export default function StickerCanvas({ tablero, onPaletaChange }: StickerCanvasProps) {
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [cargando, setCargando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [arrastrandoArchivo, setArrastrandoArchivo] = useState(false);
  const [stickerAEliminar, setStickerAEliminar] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const maxZRef = useRef(1);

  useEffect(() => {
    if (!tablero) {
      setStickers([]);
      return;
    }
    let cancelado = false;

    async function cargarStickers() {
      setCargando(true);
      const { data, error } = await supabase
        .from("stickers")
        .select("*")
        .eq("tablero_id", tablero!.id)
        .order("z_index", { ascending: true });

      if (!cancelado) {
        if (error) {
          console.error("Error cargando stickers:", error.message);
        } else if (data) {
          setStickers(data as Sticker[]);
          maxZRef.current = data.reduce(
            (max, s) => Math.max(max, s.z_index),
            1
          );
        }
        setCargando(false);
      }
    }

    cargarStickers();
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tablero?.id]);

  const subirImagen = useCallback(
    async (file: File) => {
      if (!tablero) return;
      setSubiendo(true);

      try {
        // Paleta completa (varios tonos), analizada LOCALMENTE antes de
        // subir: evita CORS y sigue siendo 100% gratis.
        const paleta = await extraerPaletaDeArchivo(file, 5);
        const colorDominante = paleta[0] || "#ff2e88";

        const extension = file.name.split(".").pop() || "png";
        const rutaArchivo = `${tablero.id}/${crypto.randomUUID()}.${extension}`;

        const { error: errorSubida } = await supabase.storage
          .from(STICKERS_BUCKET)
          .upload(rutaArchivo, file, { cacheControl: "3600", upsert: false });

        if (errorSubida) throw errorSubida;

        const { data: urlPublica } = supabase.storage
          .from(STICKERS_BUCKET)
          .getPublicUrl(rutaArchivo);

        const nuevoZ = maxZRef.current + 1;
        maxZRef.current = nuevoZ;

        const nuevoSticker = {
          tablero_id: tablero.id,
          image_url: urlPublica.publicUrl,
          x: 100 + Math.random() * 120,
          y: 100 + Math.random() * 120,
          rotation: randomRotacionInicial(),
          scale: 1,
          filter_type: "raw" as FilterType,
          z_index: nuevoZ,
          dominant_color: colorDominante,
          palette: paleta,
        };

        const { data, error } = await supabase
          .from("stickers")
          .insert(nuevoSticker)
          .select()
          .single();

        if (error) throw error;
        if (data) setStickers((prev) => [...prev, data as Sticker]);
      } catch (err) {
        console.error("Error subiendo sticker:", err);
      } finally {
        setSubiendo(false);
      }
    },
    [tablero]
  );

  async function eliminarSticker(sticker: Sticker) {
    setStickerAEliminar(null);
    setStickers((prev) => prev.filter((s) => s.id !== sticker.id));

    const { error } = await supabase
      .from("stickers")
      .delete()
      .eq("id", sticker.id);

    if (error) {
      console.error("Error eliminando sticker:", error.message);
      return;
    }

    if (!sticker.image_url.startsWith("data:")) {
      const ruta = rutaDesdeUrlPublica(sticker.image_url);
      if (ruta) {
        await supabase.storage.from(STICKERS_BUCKET).remove([ruta]);
      }
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files) Array.from(files).forEach(subirImagen);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setArrastrandoArchivo(false);
    const files = e.dataTransfer.files;
    if (files) Array.from(files).forEach(subirImagen);
  }

  function traerAlFrente(id: string) {
    const nuevoZ = maxZRef.current + 1;
    maxZRef.current = nuevoZ;
    setStickers((prev) =>
      prev.map((s) => (s.id === id ? { ...s, z_index: nuevoZ } : s))
    );
  }

  async function handleDragEnd(
    sticker: Sticker,
    info: { point: { x: number }; offset: { x: number; y: number } }
  ) {
    const nuevoX = sticker.x + info.offset.x;
    const nuevoY = sticker.y + info.offset.y;

    setStickers((prev) =>
      prev.map((s) =>
        s.id === sticker.id ? { ...s, x: nuevoX, y: nuevoY } : s
      )
    );

    const { error } = await supabase
      .from("stickers")
      .update({ x: nuevoX, y: nuevoY, z_index: sticker.z_index })
      .eq("id", sticker.id);

    if (error) console.error("Error guardando posicion:", error.message);
  }

  // Todos los colores de paleta de todos los stickers, aplanados.
  const todosLosColores = useMemo(
    () => stickers.flatMap((s) => s.palette || (s.dominant_color ? [s.dominant_color] : [])),
    [stickers]
  );

  const estadoAnimo = useMemo(
    () => calcularEstadoAnimo(todosLosColores),
    [todosLosColores]
  );

  // 4-5 tonos vivos y variados para el fondo tipo aurora (no solo 2).
  const coloresAurora = useMemo(
    () => seleccionarColoresDestacados(todosLosColores, 5),
    [todosLosColores]
  );

  // Las ultimas imagenes subidas, usadas como "ecos" difuminados de
  // fondo: literalmente se ven las fotos, muy borrosas, flotando.
  const ecos = useMemo(() => stickers.slice(-5), [stickers]);

  useEffect(() => {
    if (!onPaletaChange) return;
    onPaletaChange(todosLosColores, estadoAnimo.etiqueta);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todosLosColores, estadoAnimo.etiqueta]);

  const estiloAmbiente: React.CSSProperties = {
    "--mood-primary": estadoAnimo.primario,
    "--mood-secondary": estadoAnimo.secundario,
    "--mood-glow": estadoAnimo.glow,
  } as React.CSSProperties;

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
      ref={canvasRef}
      onDragOver={(e) => {
        e.preventDefault();
        setArrastrandoArchivo(true);
      }}
      onDragLeave={() => setArrastrandoArchivo(false)}
      onDrop={handleDrop}
      style={estiloAmbiente}
      className="art-canvas relative h-full flex-1 overflow-hidden bg-punk-black"
    >
      {/* Ecos difuminados de las fotos mismas: el fondo literalmente
          "es" tus imagenes, muy borrosas y suaves, flotando despacio. */}
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
              style={{
                top: pos.top,
                left: pos.left,
                animationDelay: `${i * 2.4}s`,
                animationDuration: `${18 + i * 3}s`,
              }}
            />
          );
        })}
      </div>

      {/* Fondo tipo aurora: varios puntos de color de la paleta real */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.55] transition-[background] duration-[2000ms] ease-out">
        {coloresAurora.map((color, i) => {
          const pos = posicionesAurora[i % posicionesAurora.length];
          return (
            <div
              key={`aurora-${i}-${color}`}
              className="aurora-blob absolute rounded-full blur-3xl"
              style={{
                top: pos.top,
                left: pos.left,
                width: 380,
                height: 380,
                background: color,
                animationDelay: `${i * 1.8}s`,
              }}
            />
          );
        })}
      </div>

      {/* Textura de fondo tipo blueprint */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:32px_32px]" />

      <div className="pointer-events-none absolute left-2 top-2 z-20 flex max-w-[78%] flex-col gap-2 sm:left-4 sm:top-4 sm:max-w-[60%]">
        <label
          className="pointer-events-auto flex w-fit cursor-pointer items-center gap-2 border-4 border-black px-2.5 py-2 font-mono text-[10px] font-bold shadow-[4px_4px_0px_#000] transition-colors sm:px-3 sm:text-[11px]"
          style={{
            backgroundColor: arrastrandoArchivo
              ? "var(--mood-secondary)"
              : "var(--mood-primary)",
            color: "#0a0a0a",
          }}
        >
          {subiendo ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
          ) : (
            <Upload className="h-4 w-4 shrink-0" />
          )}
          <span className="truncate">
            {subiendo ? "ANALIZANDO..." : "CARGAR_IMAGEN.exe"}
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleInputChange}
          />
        </label>
        <span className="w-fit max-w-full truncate border-2 border-punk-paper/20 bg-black/70 px-2 py-1 font-mono text-[9px] text-punk-paper/60 sm:text-[10px]">
          arrastra imagenes aqui // {tablero.nombre}
        </span>
      </div>

      <div className="pointer-events-none absolute right-2 top-2 z-20 flex items-center gap-1.5 border-2 border-black bg-black/70 px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-punk-paper/70 sm:right-4 sm:top-4 sm:text-[10px]">
        <Palette className="h-3 w-3 shrink-0" style={{ color: "var(--mood-primary)" }} />
        <span className="hidden sm:inline">paleta:</span>
        <span style={{ color: "var(--mood-primary)" }}>
          {estadoAnimo.etiqueta}
        </span>
      </div>

      {arrastrandoArchivo && (
        <div
          className="pointer-events-none absolute inset-2 z-10 border-4 border-dashed sm:inset-4"
          style={{ borderColor: "var(--mood-secondary)" }}
        />
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
            arrastra tu primera imagen o usa CARGAR_IMAGEN.exe
          </p>
        </div>
      )}

      <AnimatePresence>
        {stickers.map((sticker) => {
          const colorSticker = sticker.dominant_color || estadoAnimo.primario;
          return (
            <motion.div
              key={sticker.id}
              drag
              dragMomentum={false}
              onMouseDown={() => traerAlFrente(sticker.id)}
              onDragEnd={(_, info) => handleDragEnd(sticker, info)}
              initial={{
                x: sticker.x,
                y: sticker.y,
                rotate: sticker.rotation,
                scale: 0.6,
                opacity: 0,
              }}
              animate={{
                x: sticker.x,
                y: sticker.y,
                rotate: sticker.rotation,
                scale: sticker.scale,
                opacity: 1,
              }}
              exit={{ scale: 0.5, opacity: 0, transition: { duration: 0.2 } }}
              whileDrag={{ scale: sticker.scale * 1.08, cursor: "grabbing" }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              style={{ position: "absolute", zIndex: sticker.z_index, top: 0, left: 0 }}
              className="group cursor-grab select-none touch-none"
            >
              <img
                src={sticker.image_url}
                alt="sticker"
                draggable={false}
                className={`h-24 w-24 border-4 border-white object-cover sm:h-32 sm:w-32 ${
                  FILTER_CLASSES[sticker.filter_type]
                }`}
                style={{
                  boxShadow: `6px 6px 0px rgba(0,0,0,0.85), 0 0 26px -2px ${colorSticker}`,
                  filter:
                    sticker.filter_type === "duotone"
                      ? "url(#glitch-duotone)"
                      : undefined,
                }}
              />

              <button
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  setStickerAEliminar(sticker.id);
                }}
                className="absolute -right-2 -top-2 z-10 flex h-6 w-6 items-center justify-center border-2 border-black bg-punk-paper text-black opacity-0 shadow-[2px_2px_0px_#000] transition-opacity group-hover:opacity-100"
                aria-label="Eliminar sticker"
              >
                <X className="h-3.5 w-3.5" />
              </button>

              {stickerAEliminar === sticker.id && (
                <div
                  onMouseDown={(e) => e.stopPropagation()}
                  className="absolute left-1/2 top-full z-20 mt-2 w-max -translate-x-1/2 border-4 border-black bg-black px-2 py-1.5 font-mono text-[10px] shadow-[4px_4px_0px_#000]"
                >
                  <p className="mb-1.5 text-punk-paper">¿Eliminar esta imagen?</p>
                  <div className="flex gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        eliminarSticker(sticker);
                      }}
                      className="border-2 border-black bg-punk-pink px-2 py-0.5 font-bold text-black"
                    >
                      SI, BORRAR
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setStickerAEliminar(null);
                      }}
                      className="border-2 border-punk-paper/40 px-2 py-0.5 text-punk-paper/70"
                    >
                      cancelar
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>

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
          0% {
            transform: translate(0, 0) scale(1);
          }
          100% {
            transform: translate(40px, -30px) scale(1.15);
          }
        }
        @keyframes flotar-aurora {
          0% {
            transform: translate(0, 0) scale(1);
          }
          100% {
            transform: translate(-30px, 25px) scale(1.2);
          }
        }
      `}</style>
    </div>
  );
}
