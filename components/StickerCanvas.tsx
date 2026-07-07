"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  Loader2,
  ScanLine,
  Palette,
  X,
  Wand2,
  Download,
  Volume2,
  VolumeX,
  Sparkles,
  Type,
} from "lucide-react";
import { supabase, STICKERS_BUCKET } from "@/lib/supabaseClient";
import type { FilterType, Sticker, Tablero } from "@/lib/types";
import { FUENTES_CARTELITO } from "@/lib/types";
import {
  calcularEstadoAnimo,
  extraerPaletaDeArchivo,
  hexToHsl,
  seleccionarColoresDestacados,
} from "@/lib/colorAnalysis";
import { exportarLienzoComoPng } from "@/lib/exportarLienzo";
import { generarImagenIA } from "@/lib/iaGenerador";
import { sonidoActivo, sonidos } from "@/lib/sonido";

interface StickerCanvasProps {
  tablero: Tablero | null;
  onPaletaChange?: (colores: string[], etiqueta: string) => void;
}

const FILTER_CLASSES: Record<FilterType, string> = {
  raw: "",
  hackeado: "contrast-[250%] saturate-[200%] hue-rotate-[180deg] invert",
  duotone: "",
};

const SIGUIENTE_FILTRO: Record<FilterType, FilterType> = {
  raw: "hackeado",
  hackeado: "duotone",
  duotone: "raw",
};

const ETIQUETA_FILTRO: Record<FilterType, string> = {
  raw: "RAW",
  hackeado: "HACK",
  duotone: "DUO",
};

const COLORES_CARTELITO = [
  "#fff4d6",
  "#ffd6e8",
  "#d6f5ff",
  "#e2d6ff",
  "#d6ffe0",
  "#0a0a0a",
];

const ESCALA_MIN = 0.5;
const ESCALA_MAX = 2.2;

function randomRotacionInicial() {
  return Math.random() * 30 - 15;
}

function rutaDesdeUrlPublica(url: string): string | null {
  const marcador = `/object/public/${STICKERS_BUCKET}/`;
  const idx = url.indexOf(marcador);
  if (idx === -1) return null;
  return decodeURIComponent(url.slice(idx + marcador.length));
}

/** Elige texto blanco o negro segun que tan claro sea el fondo. */
function colorTextoLegible(colorFondo: string): string {
  const { l } = hexToHsl(colorFondo);
  return l > 60 ? "#0a0a0a" : "#f4f0e6";
}

export default function StickerCanvas({ tablero, onPaletaChange }: StickerCanvasProps) {
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [cargando, setCargando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [arrastrandoArchivo, setArrastrandoArchivo] = useState(false);
  const [stickerAEliminar, setStickerAEliminar] = useState<Sticker | null>(null);
  const [exportando, setExportando] = useState(false);
  const [sonidoOn, setSonidoOn] = useState(true);

  const [mostrarTexto, setMostrarTexto] = useState(false);
  const [textoNuevo, setTextoNuevo] = useState("");
  const [fuenteNueva, setFuenteNueva] = useState(FUENTES_CARTELITO[0].valor);
  const [colorNuevo, setColorNuevo] = useState(COLORES_CARTELITO[0]);

  const [mostrarIA, setMostrarIA] = useState(false);
  const [promptIA, setPromptIA] = useState("");
  const [generandoIA, setGenerandoIA] = useState(false);
  const [errorIA, setErrorIA] = useState<string | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const maxZRef = useRef(1);
  const guardadoScaleRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    setSonidoOn(sonidoActivo.get());
  }, []);

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

  const subirArchivoComoSticker = useCallback(
    async (file: File) => {
      if (!tablero) return;
      setSubiendo(true);

      try {
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
          tipo: "imagen" as const,
          image_url: urlPublica.publicUrl,
          x: 100 + Math.random() * 120,
          y: 100 + Math.random() * 120,
          rotation: randomRotacionInicial(),
          scale: 1,
          filter_type: "raw" as FilterType,
          z_index: nuevoZ,
          dominant_color: colorDominante,
          palette: paleta,
          texto: null,
          color_fondo: null,
          fuente: null,
        };

        const { data, error } = await supabase
          .from("stickers")
          .insert(nuevoSticker)
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setStickers((prev) => [...prev, data as Sticker]);
          sonidos.subir();
        }
      } catch (err) {
        console.error("Error subiendo sticker:", err);
      } finally {
        setSubiendo(false);
      }
    },
    [tablero]
  );

  async function crearCartelitoTexto() {
    if (!tablero) return;
    const texto = textoNuevo.trim();
    if (!texto) return;

    const nuevoZ = maxZRef.current + 1;
    maxZRef.current = nuevoZ;

    const nuevoSticker = {
      tablero_id: tablero.id,
      tipo: "texto" as const,
      image_url: "",
      x: 100 + Math.random() * 120,
      y: 100 + Math.random() * 120,
      rotation: randomRotacionInicial(),
      scale: 1,
      filter_type: "raw" as FilterType,
      z_index: nuevoZ,
      dominant_color: colorNuevo,
      palette: [colorNuevo],
      texto,
      color_fondo: colorNuevo,
      fuente: fuenteNueva,
    };

    const { data, error } = await supabase
      .from("stickers")
      .insert(nuevoSticker)
      .select()
      .single();

    if (error) {
      console.error("Error creando cartelito:", error.message);
      return;
    }
    if (data) {
      setStickers((prev) => [...prev, data as Sticker]);
      sonidos.subir();
      setTextoNuevo("");
      setMostrarTexto(false);
    }
  }

  async function generarConIA() {
    const prompt = promptIA.trim();
    if (!prompt || !tablero) return;
    setGenerandoIA(true);
    setErrorIA(null);

    try {
      const archivo = await generarImagenIA(prompt);
      await subirArchivoComoSticker(archivo);
      setPromptIA("");
      setMostrarIA(false);
    } catch (err) {
      console.error("Error generando con IA:", err);
      setErrorIA(
        "No se pudo generar la imagen. Intenta con otra descripcion o de nuevo en un momento."
      );
    } finally {
      setGenerandoIA(false);
    }
  }

  async function eliminarSticker(sticker: Sticker) {
    setStickerAEliminar(null);
    setStickers((prev) => prev.filter((s) => s.id !== sticker.id));
    sonidos.eliminar();

    const { error } = await supabase
      .from("stickers")
      .delete()
      .eq("id", sticker.id);

    if (error) {
      console.error("Error eliminando sticker:", error.message);
      return;
    }

    if (sticker.tipo === "imagen" && !sticker.image_url.startsWith("data:")) {
      const ruta = rutaDesdeUrlPublica(sticker.image_url);
      if (ruta) {
        await supabase.storage.from(STICKERS_BUCKET).remove([ruta]);
      }
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files) Array.from(files).forEach(subirArchivoComoSticker);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setArrastrandoArchivo(false);
    const files = e.dataTransfer.files;
    if (files) Array.from(files).forEach(subirArchivoComoSticker);
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

  function cambiarFiltro(sticker: Sticker) {
    const nuevoFiltro = SIGUIENTE_FILTRO[sticker.filter_type];
    sonidos.filtro();
    setStickers((prev) =>
      prev.map((s) => (s.id === sticker.id ? { ...s, filter_type: nuevoFiltro } : s))
    );
    supabase
      .from("stickers")
      .update({ filter_type: nuevoFiltro })
      .eq("id", sticker.id)
      .then(({ error }) => {
        if (error) console.error("Error guardando filtro:", error.message);
      });
  }

  function guardarEscala(stickerId: string, escala: number) {
    clearTimeout(guardadoScaleRef.current[stickerId]);
    guardadoScaleRef.current[stickerId] = setTimeout(async () => {
      const { error } = await supabase
        .from("stickers")
        .update({ scale: escala })
        .eq("id", stickerId);
      if (error) console.error("Error guardando escala:", error.message);
    }, 500);
  }

  function handleWheelSticker(e: React.WheelEvent, sticker: Sticker) {
    e.preventDefault();
    e.stopPropagation();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    const nuevaEscala = Math.min(
      ESCALA_MAX,
      Math.max(ESCALA_MIN, sticker.scale + delta)
    );
    setStickers((prev) =>
      prev.map((s) => (s.id === sticker.id ? { ...s, scale: nuevaEscala } : s))
    );
    guardarEscala(sticker.id, nuevaEscala);
  }

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

  const todosLosColores = useMemo(
    () => stickers.flatMap((s) => s.palette || (s.dominant_color ? [s.dominant_color] : [])),
    [stickers]
  );

  const estadoAnimo = useMemo(
    () => calcularEstadoAnimo(todosLosColores),
    [todosLosColores]
  );

  const coloresAurora = useMemo(
    () => seleccionarColoresDestacados(todosLosColores, 5),
    [todosLosColores]
  );

  const ecos = useMemo(
    () => stickers.filter((s) => s.tipo === "imagen").slice(-5),
    [stickers]
  );

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

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:32px_32px]" />

      {/* Barra de herramientas de creacion: imagen, IA, texto */}
      <div className="pointer-events-none absolute left-2 top-2 z-20 flex max-w-[85%] flex-col gap-2 sm:left-4 sm:top-4 sm:max-w-[65%]">
        <div className="pointer-events-auto flex flex-wrap gap-1.5">
          <label
            className="flex cursor-pointer items-center gap-1.5 border-4 border-black px-2 py-2 font-mono text-[10px] font-bold shadow-[4px_4px_0px_#000] transition-colors sm:px-3 sm:text-[11px]"
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
            <span className="hidden sm:inline">
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

          <button
            onClick={() => setMostrarIA(true)}
            className="flex items-center gap-1.5 border-4 border-black bg-punk-paper px-2 py-2 font-mono text-[10px] font-bold text-black shadow-[4px_4px_0px_#000] sm:px-3 sm:text-[11px]"
          >
            <Sparkles className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">GENERAR_IA.exe</span>
          </button>

          <button
            onClick={() => setMostrarTexto(true)}
            className="flex items-center gap-1.5 border-4 border-black bg-punk-yellow px-2 py-2 font-mono text-[10px] font-bold text-black shadow-[4px_4px_0px_#000] sm:px-3 sm:text-[11px]"
          >
            <Type className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">AÑADIR_TEXTO.exe</span>
          </button>
        </div>
        <span className="pointer-events-auto w-fit max-w-full truncate border-2 border-punk-paper/20 bg-black/70 px-2 py-1 font-mono text-[9px] text-punk-paper/60 sm:text-[10px]">
          arrastra imagenes aqui // {tablero.nombre}
        </span>
      </div>

      <div className="pointer-events-auto absolute right-2 top-2 z-20 flex flex-col items-end gap-1.5 sm:right-4 sm:top-4">
        <div className="flex items-center gap-1.5 border-2 border-black bg-black/70 px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-punk-paper/70 sm:text-[10px]">
          <Palette className="h-3 w-3 shrink-0" style={{ color: "var(--mood-primary)" }} />
          <span className="hidden sm:inline">paleta:</span>
          <span style={{ color: "var(--mood-primary)" }}>{estadoAnimo.etiqueta}</span>
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
            aria-label="Descargar lienzo como imagen"
            className="flex items-center gap-1 border-2 border-black bg-black/70 px-2 py-1.5 font-mono text-[9px] text-punk-paper/70 hover:text-punk-paper disabled:opacity-30 sm:text-[10px]"
          >
            {exportando ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">guardar.png</span>
          </button>
        </div>
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
            arrastra una imagen, genera algo con IA, o añade un cartelito
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
              onPointerDown={() => traerAlFrente(sticker.id)}
              onDragEnd={(_, info) => handleDragEnd(sticker, info)}
              onWheel={(e) => handleWheelSticker(e, sticker)}
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
              {sticker.tipo === "texto" ? (
                <div
                  className="flex h-32 w-40 items-center justify-center border-4 border-white p-3 text-center sm:h-40 sm:w-56"
                  style={{
                    backgroundColor: sticker.color_fondo || "#fff4d6",
                    color: colorTextoLegible(sticker.color_fondo || "#fff4d6"),
                    fontFamily: sticker.fuente || FUENTES_CARTELITO[0].valor,
                    boxShadow: `6px 6px 0px rgba(0,0,0,0.85), 0 0 26px -2px ${colorSticker}`,
                  }}
                >
                  <p className="line-clamp-6 text-base leading-snug sm:text-xl">
                    {sticker.texto}
                  </p>
                </div>
              ) : (
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
              )}

              <div className="absolute -right-2 -top-2 z-10 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                {sticker.tipo === "imagen" && (
                  <button
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      cambiarFiltro(sticker);
                    }}
                    className="flex h-6 items-center gap-0.5 border-2 border-black bg-punk-cyan px-1 text-[8px] font-bold text-black shadow-[2px_2px_0px_#000]"
                    aria-label="Cambiar filtro"
                    title={`Filtro actual: ${ETIQUETA_FILTRO[sticker.filter_type]} (clic para cambiar)`}
                  >
                    <Wand2 className="h-3 w-3" />
                    {ETIQUETA_FILTRO[sticker.filter_type]}
                  </button>
                )}
                <button
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    setStickerAEliminar(sticker);
                  }}
                  className="flex h-6 w-6 items-center justify-center border-2 border-black bg-punk-paper text-black shadow-[2px_2px_0px_#000]"
                  aria-label="Eliminar sticker"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Modal: eliminar sticker */}
      {stickerAEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-xs border-4 border-black bg-neutral-900 p-4 font-mono shadow-[6px_6px_0px_#000]">
            {stickerAEliminar.tipo === "imagen" ? (
              <img
                src={stickerAEliminar.image_url}
                alt=""
                className="mx-auto mb-3 h-20 w-20 border-4 border-white object-cover"
              />
            ) : (
              <div
                className="mx-auto mb-3 flex h-20 w-28 items-center justify-center border-4 border-white p-2 text-center text-xs"
                style={{
                  backgroundColor: stickerAEliminar.color_fondo || "#fff4d6",
                  color: colorTextoLegible(stickerAEliminar.color_fondo || "#fff4d6"),
                  fontFamily: stickerAEliminar.fuente || undefined,
                }}
              >
                {stickerAEliminar.texto}
              </div>
            )}
            <p className="mb-3 text-center text-xs text-punk-paper">
              ¿Eliminar esto del lienzo? Esta accion no se puede deshacer.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => eliminarSticker(stickerAEliminar)}
                className="flex-1 border-2 border-black bg-punk-pink px-3 py-1.5 text-xs font-bold text-black"
              >
                SI, BORRAR
              </button>
              <button
                onClick={() => setStickerAEliminar(null)}
                className="flex-1 border-2 border-punk-paper/40 px-3 py-1.5 text-xs text-punk-paper/70"
              >
                cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: añadir cartelito de texto */}
      {mostrarTexto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm border-4 border-black bg-neutral-900 p-4 font-mono shadow-[6px_6px_0px_#000]">
            <p className="mb-2 text-xs text-punk-cyan">nuevo_cartelito.txt</p>
            <textarea
              autoFocus
              value={textoNuevo}
              onChange={(e) => setTextoNuevo(e.target.value.slice(0, 140))}
              placeholder="Escribe tu mensaje..."
              rows={3}
              className="mb-3 w-full resize-none border-4 border-black bg-black px-2 py-1.5 text-sm text-punk-paper outline-none placeholder:text-punk-paper/30 focus:border-punk-cyan"
              style={{ fontFamily: fuenteNueva }}
            />
            <p className="mb-1 text-[10px] uppercase tracking-wider text-punk-paper/50">
              tipografia
            </p>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {FUENTES_CARTELITO.map((f) => (
                <button
                  key={f.valor}
                  onClick={() => setFuenteNueva(f.valor)}
                  className={`border-2 px-2 py-1 text-[11px] ${
                    fuenteNueva === f.valor
                      ? "border-punk-cyan bg-punk-cyan text-black"
                      : "border-punk-paper/30 text-punk-paper/70"
                  }`}
                  style={{ fontFamily: f.valor }}
                >
                  {f.etiqueta}
                </button>
              ))}
            </div>
            <p className="mb-1 text-[10px] uppercase tracking-wider text-punk-paper/50">
              color de fondo
            </p>
            <div className="mb-4 flex gap-1.5">
              {COLORES_CARTELITO.map((c) => (
                <button
                  key={c}
                  onClick={() => setColorNuevo(c)}
                  aria-label={`Color ${c}`}
                  className={`h-7 w-7 border-2 ${
                    colorNuevo === c ? "border-punk-cyan" : "border-black"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={crearCartelitoTexto}
                disabled={!textoNuevo.trim()}
                className="flex-1 border-2 border-black bg-punk-yellow px-3 py-1.5 text-xs font-bold text-black disabled:opacity-40"
              >
                AÑADIR AL LIENZO
              </button>
              <button
                onClick={() => {
                  setMostrarTexto(false);
                  setTextoNuevo("");
                }}
                className="flex-1 border-2 border-punk-paper/40 px-3 py-1.5 text-xs text-punk-paper/70"
              >
                cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: generar imagen con IA */}
      {mostrarIA && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm border-4 border-black bg-neutral-900 p-4 font-mono shadow-[6px_6px_0px_#000]">
            <p className="mb-1 flex items-center gap-1.5 text-xs text-punk-cyan">
              <Sparkles className="h-3.5 w-3.5" /> generar_imagen_ia.exe
            </p>
            <p className="mb-2 text-[10px] text-punk-paper/50">
              Describe lo que quieres ver. Gratis, sin cuenta — corre en un
              servicio externo (Pollinations.ai).
            </p>
            <input
              autoFocus
              value={promptIA}
              onChange={(e) => setPromptIA(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !generandoIA) generarConIA();
              }}
              placeholder="ej: corazon de neon fucsia estilo glitch"
              className="mb-3 w-full border-4 border-black bg-black px-2 py-1.5 text-xs text-punk-paper outline-none placeholder:text-punk-paper/30 focus:border-punk-cyan"
            />
            {errorIA && (
              <p className="mb-3 text-[10px] text-punk-pink">{errorIA}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={generarConIA}
                disabled={generandoIA || !promptIA.trim()}
                className="flex flex-1 items-center justify-center gap-1.5 border-2 border-black bg-punk-paper px-3 py-1.5 text-xs font-bold text-black disabled:opacity-40"
              >
                {generandoIA ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> GENERANDO...
                  </>
                ) : (
                  "GENERAR"
                )}
              </button>
              <button
                onClick={() => {
                  setMostrarIA(false);
                  setPromptIA("");
                  setErrorIA(null);
                }}
                disabled={generandoIA}
                className="flex-1 border-2 border-punk-paper/40 px-3 py-1.5 text-xs text-punk-paper/70"
              >
                cancelar
              </button>
            </div>
          </div>
        </div>
      )}

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
