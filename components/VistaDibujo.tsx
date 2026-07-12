"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Pencil,
  Highlighter,
  Paintbrush,
  Eraser,
  Undo2,
  Redo2,
  Trash2,
  Download,
  Loader2,
  Check,
  Palette,
} from "lucide-react";
import type { Tablero } from "@/lib/types";
import { useTema } from "@/lib/TemaContext";
import { supabase, STICKERS_BUCKET } from "@/lib/supabaseClient";
import { hexToRgb, rgbToHex } from "@/lib/colorAnalysis";
import {
  dibujarSegmento,
  COLORES_RAPIDOS,
  PINCELES,
  type ConfigPincel,
  type PuntoTrazo,
  type TipoPincel,
} from "@/lib/dibujoEngine";

interface VistaDibujoProps {
  tablero: Tablero | null;
}

const ICONO_PINCEL: Record<TipoPincel, typeof Pencil> = {
  lapiz: Pencil,
  marcador: Highlighter,
  pincel: Paintbrush,
  borrador: Eraser,
};

const MAX_HISTORIAL = 25;

/**
 * Modo "Dibujo": un lienzo en blanco para dibujar libremente con
 * distintos pinceles (lapiz, marcador, pincel, borrador), cualquier
 * color (paleta nativa + hex + RGB), deshacer/rehacer, y guardado
 * automatico en Supabase Storage.
 *
 * Usa Pointer Events (no mouse/touch por separado) para que funcione
 * identico con mouse, dedo, o lapiz optico.
 */
export default function VistaDibujo({ tablero }: VistaDibujoProps) {
  const tema = useTema();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contenedorRef = useRef<HTMLDivElement>(null);
  const dibujandoRef = useRef(false);
  const puntosRef = useRef<PuntoTrazo[]>([]);
  const historialRef = useRef<string[]>([]);
  const indiceHistorialRef = useRef(-1);
  const guardarTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const [pincel, setPincel] = useState<TipoPincel>("pincel");
  const [color, setColor] = useState("#111827");
  const [tamano, setTamano] = useState(10);
  const [opacidad, setOpacidad] = useState(1);
  const [mostrarColor, setMostrarColor] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [guardadoOk, setGuardadoOk] = useState(false);
  const [puedeDeshacer, setPuedeDeshacer] = useState(false);
  const [puedeRehacer, setPuedeRehacer] = useState(false);

  const rgb = hexToRgb(color);

  // --- Configuracion del canvas: se ajusta al tamaño del contenedor,
  // escalado por devicePixelRatio para que se vea nitido en moviles.
  const ajustarTamanoCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const contenedor = contenedorRef.current;
    if (!canvas || !contenedor) return;

    const dpr = window.devicePixelRatio || 1;
    const { width, height } = contenedor.getBoundingClientRect();

    // Preservamos el contenido actual al redimensionar (ej. al girar
    // el telefono), reescalando la imagen previa.
    const anterior = canvas.toDataURL();
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    if (anterior && anterior.length > 100) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, width, height);
      img.src = anterior;
    }
  }, []);

  useEffect(() => {
    ajustarTamanoCanvas();
    window.addEventListener("resize", ajustarTamanoCanvas);
    return () => window.removeEventListener("resize", ajustarTamanoCanvas);
  }, [ajustarTamanoCanvas]);

  // --- Cargar el dibujo guardado de este tablero (si existe)
  useEffect(() => {
    if (!tablero) return;
    let cancelado = false;
    setCargando(true);
    // Capturamos el valor aqui afuera: dentro de la funcion async
    // anidada, TypeScript ya no puede seguir garantizando que
    // "tablero" no sea null en cada punto de uso.
    const urlGuardada = tablero.dibujo_url;

    async function cargar() {
      const canvas = canvasRef.current;
      const contenedor = contenedorRef.current;
      if (!canvas || !contenedor) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const { width, height } = contenedor.getBoundingClientRect();
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);

      const url = urlGuardada;
      if (url) {
        await new Promise<void>((resolve) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            if (!cancelado) ctx.drawImage(img, 0, 0, width, height);
            resolve();
          };
          img.onerror = () => resolve();
          img.src = url;
        });
      }

      if (!cancelado) {
        guardarHistorial();
        setCargando(false);
      }
    }

    cargar();
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tablero?.id]);

  function guardarHistorial() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const data = canvas.toDataURL("image/png");

    // Si estabamos a mitad del historial (por un undo previo),
    // cortamos el futuro antes de agregar el nuevo estado.
    historialRef.current = historialRef.current.slice(0, indiceHistorialRef.current + 1);
    historialRef.current.push(data);
    if (historialRef.current.length > MAX_HISTORIAL) {
      historialRef.current.shift();
    }
    indiceHistorialRef.current = historialRef.current.length - 1;
    setPuedeDeshacer(indiceHistorialRef.current > 0);
    setPuedeRehacer(false);
  }

  function restaurarDesdeHistorial(indice: number) {
    const canvas = canvasRef.current;
    const contenedor = contenedorRef.current;
    if (!canvas || !contenedor) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const data = historialRef.current[indice];
    if (!data) return;

    const { width, height } = contenedor.getBoundingClientRect();
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
    };
    img.src = data;
  }

  function deshacer() {
    if (indiceHistorialRef.current <= 0) return;
    indiceHistorialRef.current -= 1;
    restaurarDesdeHistorial(indiceHistorialRef.current);
    setPuedeDeshacer(indiceHistorialRef.current > 0);
    setPuedeRehacer(true);
    programarGuardado();
  }

  function rehacer() {
    if (indiceHistorialRef.current >= historialRef.current.length - 1) return;
    indiceHistorialRef.current += 1;
    restaurarDesdeHistorial(indiceHistorialRef.current);
    setPuedeDeshacer(true);
    setPuedeRehacer(indiceHistorialRef.current < historialRef.current.length - 1);
    programarGuardado();
  }

  function limpiarTodo() {
    const canvas = canvasRef.current;
    const contenedor = contenedorRef.current;
    if (!canvas || !contenedor) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { width, height } = contenedor.getBoundingClientRect();
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    guardarHistorial();
    programarGuardado();
  }

  // --- Guardado automatico (debounced) a Supabase Storage
  function programarGuardado() {
    if (!tablero) return;
    setGuardadoOk(false);
    clearTimeout(guardarTimeoutRef.current);
    guardarTimeoutRef.current = setTimeout(async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      setGuardando(true);

      canvas.toBlob(async (blob) => {
        if (!blob || !tablero) {
          setGuardando(false);
          return;
        }
        const ruta = `dibujos/${tablero.id}.png`;
        const { error: errorSubida } = await supabase.storage
          .from(STICKERS_BUCKET)
          .upload(ruta, blob, { cacheControl: "3600", upsert: true, contentType: "image/png" });

        if (errorSubida) {
          console.error("Error guardando dibujo:", errorSubida.message);
          setGuardando(false);
          return;
        }

        const { data: urlPublica } = supabase.storage.from(STICKERS_BUCKET).getPublicUrl(ruta);
        const urlConCache = `${urlPublica.publicUrl}?t=${Date.now()}`;

        await supabase.from("tableros").update({ dibujo_url: urlConCache }).eq("id", tablero.id);

        setGuardando(false);
        setGuardadoOk(true);
        setTimeout(() => setGuardadoOk(false), 2000);
      }, "image/png");
    }, 900);
  }

  // --- Manejo del trazo con Pointer Events (mouse + tactil + lapiz optico)
  function coordenadasRelativas(e: React.PointerEvent<HTMLCanvasElement>): PuntoTrazo {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      presion: e.pressure > 0 ? e.pressure : 0.5,
      t: performance.now(),
    };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    dibujandoRef.current = true;
    puntosRef.current = [coordenadasRelativas(e)];
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!dibujandoRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    puntosRef.current.push(coordenadasRelativas(e));

    const config: ConfigPincel = { tipo: pincel, color, tamano, opacidad };
    dibujarSegmento(ctx, puntosRef.current, config);
  }

  function handlePointerUp() {
    if (!dibujandoRef.current) return;
    dibujandoRef.current = false;
    puntosRef.current = [];
    guardarHistorial();
    programarGuardado();
  }

  function actualizarColorHex(nuevoHex: string) {
    if (/^#[0-9a-fA-F]{6}$/.test(nuevoHex)) setColor(nuevoHex);
  }

  function actualizarCanalRgb(canal: "r" | "g" | "b", valor: number) {
    const actual = hexToRgb(color);
    const nuevo = { ...actual, [canal]: Math.min(255, Math.max(0, valor)) };
    setColor(rgbToHex(nuevo.r, nuevo.g, nuevo.b));
  }

  const estiloPanel = {
    backgroundColor: tema.superficie,
    color: tema.texto,
    borderRadius: tema.bordeRadio,
    boxShadow: tema.sombra,
    fontFamily: tema.fuenteUI,
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
      {/* Lienzo de dibujo */}
      <div ref={contenedorRef} className="relative flex-1 touch-none overflow-hidden">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full touch-none"
          style={{ cursor: pincel === "borrador" ? "cell" : "crosshair" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
        {cargando && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70">
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: tema.acento }} />
          </div>
        )}
      </div>

      {/* Barra de estado: guardado */}
      <div className="pointer-events-none absolute right-3 top-3 z-30 flex items-center gap-1 px-2 py-1 text-[10px]" style={{ backgroundColor: `${tema.superficie}dd`, color: tema.textoSuave, borderRadius: tema.bordeRadio / 3 }}>
        {guardando ? (
          <>
            <Loader2 className="h-3 w-3 animate-spin" /> Guardando...
          </>
        ) : guardadoOk ? (
          <>
            <Check className="h-3 w-3" style={{ color: tema.acento }} /> Guardado
          </>
        ) : (
          tablero.nombre
        )}
      </div>

      {/* Barra de herramientas inferior, siempre accesible en cualquier tamaño de pantalla */}
      <div
        className="relative z-30 flex flex-wrap items-center gap-2 border-t p-2 sm:p-3"
        style={{ backgroundColor: tema.superficie, borderColor: `${tema.textoSuave}22`, fontFamily: tema.fuenteUI }}
      >
        {/* Selector de pincel */}
        <div className="flex gap-1">
          {PINCELES.map((p) => {
            const Icono = ICONO_PINCEL[p.valor];
            const activo = pincel === p.valor;
            return (
              <button
                key={p.valor}
                onClick={() => setPincel(p.valor)}
                aria-label={p.etiqueta}
                title={p.etiqueta}
                className="flex h-11 w-11 items-center justify-center sm:h-9 sm:w-9"
                style={{
                  backgroundColor: activo ? tema.acento : "transparent",
                  color: activo ? tema.fondo : tema.textoSuave,
                  borderRadius: tema.bordeRadio / 2,
                  border: `1px solid ${activo ? tema.acento : `${tema.textoSuave}33`}`,
                }}
              >
                <Icono className="h-5 w-5" />
              </button>
            );
          })}
        </div>

        {/* Color actual */}
        <button
          onClick={() => setMostrarColor((v) => !v)}
          aria-label="Elegir color"
          className="flex h-11 w-11 shrink-0 items-center justify-center sm:h-9 sm:w-9"
          style={{ borderRadius: tema.bordeRadio / 2, border: `2px solid ${tema.textoSuave}44` }}
        >
          <span className="block h-6 w-6 rounded-full border" style={{ backgroundColor: color, borderColor: `${tema.textoSuave}44` }} />
        </button>

        {/* Grosor */}
        <div className="flex min-w-[110px] flex-1 items-center gap-2 px-1">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: tema.textoSuave }} />
          <input
            type="range"
            min={1}
            max={48}
            value={tamano}
            onChange={(e) => setTamano(Number(e.target.value))}
            className="w-full"
            style={{ accentColor: tema.acento }}
          />
          <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: tema.textoSuave }} />
        </div>

        {/* Deshacer / rehacer / limpiar / exportar */}
        <div className="flex gap-1">
          <button
            onClick={deshacer}
            disabled={!puedeDeshacer}
            aria-label="Deshacer"
            className="flex h-11 w-11 items-center justify-center disabled:opacity-30 sm:h-9 sm:w-9"
            style={{ borderRadius: tema.bordeRadio / 2, border: `1px solid ${tema.textoSuave}33`, color: tema.textoSuave }}
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <button
            onClick={rehacer}
            disabled={!puedeRehacer}
            aria-label="Rehacer"
            className="flex h-11 w-11 items-center justify-center disabled:opacity-30 sm:h-9 sm:w-9"
            style={{ borderRadius: tema.bordeRadio / 2, border: `1px solid ${tema.textoSuave}33`, color: tema.textoSuave }}
          >
            <Redo2 className="h-4 w-4" />
          </button>
          <button
            onClick={limpiarTodo}
            aria-label="Borrar todo"
            className="flex h-11 w-11 items-center justify-center sm:h-9 sm:w-9"
            style={{ borderRadius: tema.bordeRadio / 2, border: `1px solid ${tema.textoSuave}33`, color: tema.textoSuave }}
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              const canvas = canvasRef.current;
              if (!canvas) return;
              const enlace = document.createElement("a");
              enlace.href = canvas.toDataURL("image/png");
              enlace.download = `${tablero.nombre.replace(/\s+/g, "_")}_dibujo.png`;
              enlace.click();
            }}
            aria-label="Descargar"
            className="flex h-11 w-11 items-center justify-center sm:h-9 sm:w-9"
            style={{ borderRadius: tema.bordeRadio / 2, border: `1px solid ${tema.textoSuave}33`, color: tema.textoSuave }}
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Panel de color: RGB, hex, y paleta rapida */}
      {mostrarColor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setMostrarColor(false)}>
          <div className="w-full max-w-xs p-4" style={estiloPanel} onClick={(e) => e.stopPropagation()}>
            <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold" style={{ color: tema.acento }}>
              <Palette className="h-3.5 w-3.5" /> Elegir color
            </p>

            <div className="mb-3 flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-12 w-12 cursor-pointer border-0 bg-transparent p-0"
              />
              <input
                type="text"
                value={color}
                onChange={(e) => actualizarColorHex(e.target.value)}
                placeholder="#111827"
                className="flex-1 px-2 py-2 text-sm outline-none"
                style={{ border: `1px solid ${tema.textoSuave}44`, borderRadius: tema.bordeRadio / 2, backgroundColor: tema.fondo, color: tema.texto }}
              />
            </div>

            <div className="mb-3 grid grid-cols-3 gap-2">
              {(["r", "g", "b"] as const).map((canal) => (
                <div key={canal}>
                  <label className="mb-1 block text-[9px] uppercase tracking-wider" style={{ color: tema.textoSuave }}>
                    {canal.toUpperCase()}
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={255}
                    value={rgb[canal]}
                    onChange={(e) => actualizarCanalRgb(canal, Number(e.target.value))}
                    className="w-full px-2 py-1.5 text-sm outline-none"
                    style={{ border: `1px solid ${tema.textoSuave}44`, borderRadius: tema.bordeRadio / 3, backgroundColor: tema.fondo, color: tema.texto }}
                  />
                </div>
              ))}
            </div>

            <p className="mb-1 text-[9px] uppercase tracking-wider" style={{ color: tema.textoSuave }}>
              Rápidos
            </p>
            <div className="mb-4 flex flex-wrap gap-1.5">
              {COLORES_RAPIDOS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  aria-label={`Color ${c}`}
                  className="h-8 w-8"
                  style={{ backgroundColor: c, border: `2px solid ${color === c ? tema.acento : "rgba(0,0,0,0.1)"}`, borderRadius: tema.bordeRadio / 3 }}
                />
              ))}
            </div>

            <p className="mb-1 text-[9px] uppercase tracking-wider" style={{ color: tema.textoSuave }}>
              Opacidad del pincel
            </p>
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.05}
              value={opacidad}
              onChange={(e) => setOpacidad(Number(e.target.value))}
              className="mb-4 w-full"
              style={{ accentColor: tema.acento }}
            />

            <button
              onClick={() => setMostrarColor(false)}
              className="w-full px-3 py-2 text-xs font-bold"
              style={{ backgroundColor: tema.acento, color: tema.fondo, borderRadius: tema.bordeRadio / 2 }}
            >
              Listo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}