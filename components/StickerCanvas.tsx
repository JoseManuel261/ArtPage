"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Upload, Loader2, ScanLine, Palette } from "lucide-react";
import { supabase, STICKERS_BUCKET } from "@/lib/supabaseClient";
import type { FilterType, Sticker, Tablero } from "@/lib/types";
import { calcularEstadoAnimo, extraerColorDominante } from "@/lib/colorAnalysis";

interface StickerCanvasProps {
  tablero: Tablero | null;
  /** Notifica hacia arriba la paleta de colores detectada, para mostrarla
   * en otras partes de la interfaz (ej. la barra lateral). */
  onPaletaChange?: (colores: string[], etiqueta: string) => void;
}

const FILTER_CLASSES: Record<FilterType, string> = {
  raw: "",
  hackeado: "contrast-[250%] saturate-[200%] hue-rotate-[180deg] invert",
  duotone: "",
};

function randomRotacionInicial() {
  return Math.random() * 30 - 15; // entre -15 y 15 grados
}

export default function StickerCanvas({ tablero, onPaletaChange }: StickerCanvasProps) {
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [cargando, setCargando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [arrastrandoArchivo, setArrastrandoArchivo] = useState(false);
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

          if (data.length === 0) {
            await sembrarStickersDefault(tablero!.id);
          }
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

  async function sembrarStickersDefault(tableroId: string) {
    const defaults = [
      { texto: "SIN SEÑAL", x: 80, y: 60, color: "#ff2e88" },
      { texto: "COLAGE.EXE", x: 260, y: 140, color: "#22e8ff" },
      { texto: "CONFIA EN EL RUIDO", x: 140, y: 260, color: "#f5ff00" },
    ];
    const svgToDataUrl = (texto: string, color: string) => {
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='260' height='90'>
        <rect width='100%' height='100%' fill='#0a0a0a'/>
        <text x='50%' y='55%' dominant-baseline='middle' text-anchor='middle'
          font-family='monospace' font-size='20' font-weight='bold' fill='${color}'>${texto}</text>
      </svg>`;
      return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
    };

    const nuevos = defaults.map((d, i) => ({
      tablero_id: tableroId,
      image_url: svgToDataUrl(d.texto, d.color),
      x: d.x,
      y: d.y,
      rotation: randomRotacionInicial(),
      scale: 1,
      filter_type: "raw" as FilterType,
      z_index: i + 1,
      dominant_color: d.color,
    }));

    const { data, error } = await supabase
      .from("stickers")
      .insert(nuevos)
      .select();

    if (!error && data) {
      setStickers(data as Sticker[]);
      maxZRef.current = nuevos.length;
    }
  }

  const subirImagen = useCallback(
    async (file: File) => {
      if (!tablero) return;
      setSubiendo(true);

      try {
        const extension = file.name.split(".").pop() || "png";
        const rutaArchivo = `${tablero.id}/${crypto.randomUUID()}.${extension}`;

        const { error: errorSubida } = await supabase.storage
          .from(STICKERS_BUCKET)
          .upload(rutaArchivo, file, { cacheControl: "3600", upsert: false });

        if (errorSubida) throw errorSubida;

        const { data: urlPublica } = supabase.storage
          .from(STICKERS_BUCKET)
          .getPublicUrl(rutaArchivo);

        const colorDominante = await extraerColorDominante(
          urlPublica.publicUrl
        );

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

  const estadoAnimo = useMemo(() => {
    const colores = stickers
      .map((s) => s.dominant_color)
      .filter((c): c is string => Boolean(c));
    return calcularEstadoAnimo(colores);
  }, [stickers]);

  useEffect(() => {
    if (!onPaletaChange) return;
    const colores = stickers
      .map((s) => s.dominant_color)
      .filter((c): c is string => Boolean(c));
    onPaletaChange(colores, estadoAnimo.etiqueta);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stickers, estadoAnimo.etiqueta]);

  const estiloAmbiente: React.CSSProperties = {
    "--mood-primary": estadoAnimo.primario,
    "--mood-secondary": estadoAnimo.secundario,
    "--mood-glow": estadoAnimo.glow,
  } as React.CSSProperties;

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
      className="art-canvas relative h-full flex-1 overflow-hidden bg-punk-black transition-colors duration-[1500ms]"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-40 transition-[background] duration-[2000ms] ease-out"
        style={{
          background: `radial-gradient(circle at 20% 15%, var(--mood-primary) 0%, transparent 45%),
                        radial-gradient(circle at 85% 80%, var(--mood-secondary) 0%, transparent 50%)`,
        }}
      />

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
            whileDrag={{ scale: sticker.scale * 1.08, cursor: "grabbing" }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            style={{ position: "absolute", zIndex: sticker.z_index, top: 0, left: 0 }}
            className="cursor-grab select-none touch-none"
          >
            <img
              src={sticker.image_url}
              alt="sticker"
              draggable={false}
              className={`h-24 w-24 border-4 border-white object-cover sm:h-32 sm:w-32 ${
                FILTER_CLASSES[sticker.filter_type]
              }`}
              style={{
                boxShadow: `6px 6px 0px rgba(0,0,0,0.85), 0 0 22px -4px ${colorSticker}`,
                filter:
                  sticker.filter_type === "duotone"
                    ? "url(#glitch-duotone)"
                    : undefined,
              }}
            />
          </motion.div>
        );
      })}
    </div>
  );
}
