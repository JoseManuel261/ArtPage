"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Upload, Loader2, ScanLine } from "lucide-react";
import { supabase, STICKERS_BUCKET } from "@/lib/supabaseClient";
import type { FilterType, Sticker, Tablero } from "@/lib/types";

interface StickerCanvasProps {
  tablero: Tablero | null;
}

const FILTER_CLASSES: Record<FilterType, string> = {
  raw: "",
  hackeado: "contrast-[250%] saturate-[200%] hue-rotate-[180deg] invert",
  duotone: "",
};

function randomRotacionInicial() {
  return Math.random() * 30 - 15; // entre -15 y 15 grados
}

export default function StickerCanvas({ tablero }: StickerCanvasProps) {
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [cargando, setCargando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [arrastrandoArchivo, setArrastrandoArchivo] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const maxZRef = useRef(1);

  // Carga los stickers del tablero seleccionado
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

          // Tablero recien creado y vacio: sembrar stickers de bienvenida
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
      { texto: "SYSTEM FAILURE", x: 80, y: 60 },
      { texto: "DEDSEC", x: 260, y: 140 },
      { texto: "TRUST YOUR GLITCH", x: 140, y: 260 },
    ];
    const svgToDataUrl = (texto: string) => {
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='260' height='90'>
        <rect width='100%' height='100%' fill='#0a0a0a'/>
        <text x='50%' y='55%' dominant-baseline='middle' text-anchor='middle'
          font-family='monospace' font-size='22' font-weight='bold' fill='#ff007f'>${texto}</text>
      </svg>`;
      return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
    };

    const nuevos = defaults.map((d, i) => ({
      tablero_id: tableroId,
      image_url: svgToDataUrl(d.texto),
      x: d.x,
      y: d.y,
      rotation: randomRotacionInicial(),
      scale: 1,
      filter_type: "raw" as FilterType,
      z_index: i + 1,
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

  if (!tablero) {
    return (
      <div className="flex h-full flex-1 items-center justify-center bg-dedsec-black">
        <p className="border-4 border-dashed border-dedsec-fuchsia/40 px-8 py-6 font-mono text-sm text-dedsec-paper/50">
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
      className="dedsec-canvas relative h-full flex-1 overflow-hidden bg-dedsec-black"
    >
      {/* Textura de fondo tipo blueprint hacker */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(0,243,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(0,243,255,0.06)_1px,transparent_1px)] bg-[size:32px_32px]" />

      {/* Zona drop / carga estilo terminal */}
      <div className="pointer-events-none absolute left-4 top-4 z-20 flex flex-col gap-2">
        <label
          className={`pointer-events-auto flex cursor-pointer items-center gap-2 border-4 border-black px-3 py-2 font-mono text-[11px] font-bold shadow-[4px_4px_0px_#000] transition-colors ${
            arrastrandoArchivo
              ? "bg-dedsec-yellow text-black"
              : "bg-dedsec-cyan text-black hover:bg-dedsec-fuchsia"
          }`}
        >
          {subiendo ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {subiendo ? "INYECTANDO..." : "CARGAR_ARCHIVO.exe"}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleInputChange}
          />
        </label>
        <span className="border-2 border-dedsec-paper/20 bg-black/70 px-2 py-1 font-mono text-[10px] text-dedsec-paper/60">
          arrastra imagenes aqui // tablero: {tablero.nombre}
        </span>
      </div>

      {arrastrandoArchivo && (
        <div className="pointer-events-none absolute inset-4 z-10 border-4 border-dashed border-dedsec-yellow" />
      )}

      {cargando && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 font-mono text-dedsec-cyan">
          <ScanLine className="mr-2 h-4 w-4 animate-pulse" />
          cargando_lienzo...
        </div>
      )}

      {/* Stickers arrastrables */}
      {stickers.map((sticker) => (
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
          className="cursor-grab select-none"
        >
          <img
            src={sticker.image_url}
            alt="sticker"
            draggable={false}
            className={`h-32 w-32 border-4 border-white object-cover shadow-[6px_6px_0px_rgba(0,0,0,0.85)] ${
              FILTER_CLASSES[sticker.filter_type]
            }`}
            style={
              sticker.filter_type === "duotone"
                ? { filter: "url(#dedsec-duotone)" }
                : undefined
            }
          />
        </motion.div>
      ))}
    </div>
  );
}
