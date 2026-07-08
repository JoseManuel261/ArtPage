"use client";

import { useState } from "react";
import { Upload, Loader2, Sparkles, Type } from "lucide-react";
import { FUENTES_CARTELITO } from "@/lib/types";

const COLORES_CARTELITO = ["#fff4d6", "#ffd6e8", "#d6f5ff", "#e2d6ff", "#d6ffe0", "#0a0a0a"];

interface BarraCreacionProps {
  subiendo: boolean;
  colorPrimario: string;
  colorSecundario: string;
  onSubirArchivos: (files: File[]) => void;
  onGenerarIA: (prompt: string) => Promise<void>;
  onCrearTexto: (texto: string, fuente: string, colorFondo: string) => Promise<void>;
}

/**
 * Barra de herramientas compartida entre los 4 modos de interfaz:
 * cargar imagen, generar con IA (Pollinations, gratis) y añadir un
 * cartelito de texto. Evita triplicar este codigo en cada vista.
 */
export default function BarraCreacion({
  subiendo,
  colorPrimario,
  colorSecundario,
  onSubirArchivos,
  onGenerarIA,
  onCrearTexto,
}: BarraCreacionProps) {
  const [arrastrando, setArrastrando] = useState(false);
  const [mostrarTexto, setMostrarTexto] = useState(false);
  const [textoNuevo, setTextoNuevo] = useState("");
  const [fuenteNueva, setFuenteNueva] = useState(FUENTES_CARTELITO[0].valor);
  const [colorNuevo, setColorNuevo] = useState(COLORES_CARTELITO[0]);

  const [mostrarIA, setMostrarIA] = useState(false);
  const [promptIA, setPromptIA] = useState("");
  const [generandoIA, setGenerandoIA] = useState(false);
  const [errorIA, setErrorIA] = useState<string | null>(null);

  async function confirmarTexto() {
    if (!textoNuevo.trim()) return;
    await onCrearTexto(textoNuevo, fuenteNueva, colorNuevo);
    setTextoNuevo("");
    setMostrarTexto(false);
  }

  async function confirmarIA() {
    const prompt = promptIA.trim();
    if (!prompt) return;
    setGenerandoIA(true);
    setErrorIA(null);
    try {
      await onGenerarIA(prompt);
      setPromptIA("");
      setMostrarIA(false);
    } catch {
      setErrorIA("No se pudo generar la imagen. Intenta con otra descripcion.");
    } finally {
      setGenerandoIA(false);
    }
  }

  return (
    <>
      <div className="pointer-events-auto flex flex-wrap gap-1.5">
        <label
          className="flex cursor-pointer items-center gap-1.5 border-4 border-black px-2 py-2 font-mono text-[10px] font-bold shadow-[4px_4px_0px_#000] transition-colors sm:px-3 sm:text-[11px]"
          style={{ backgroundColor: arrastrando ? colorSecundario : colorPrimario, color: "#0a0a0a" }}
        >
          {subiendo ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
          ) : (
            <Upload className="h-4 w-4 shrink-0" />
          )}
          <span className="hidden sm:inline">{subiendo ? "ANALIZANDO..." : "CARGAR_IMAGEN.exe"}</span>
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) onSubirArchivos(Array.from(e.target.files));
              e.target.value = "";
            }}
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
            <p className="mb-1 text-[10px] uppercase tracking-wider text-punk-paper/50">tipografia</p>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {FUENTES_CARTELITO.map((f) => (
                <button
                  key={f.valor}
                  onClick={() => setFuenteNueva(f.valor)}
                  className={`border-2 px-2 py-1 text-[11px] ${
                    fuenteNueva === f.valor ? "border-punk-cyan bg-punk-cyan text-black" : "border-punk-paper/30 text-punk-paper/70"
                  }`}
                  style={{ fontFamily: f.valor }}
                >
                  {f.etiqueta}
                </button>
              ))}
            </div>
            <p className="mb-1 text-[10px] uppercase tracking-wider text-punk-paper/50">color de fondo</p>
            <div className="mb-4 flex gap-1.5">
              {COLORES_CARTELITO.map((c) => (
                <button
                  key={c}
                  onClick={() => setColorNuevo(c)}
                  aria-label={`Color ${c}`}
                  className={`h-7 w-7 border-2 ${colorNuevo === c ? "border-punk-cyan" : "border-black"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={confirmarTexto}
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
                if (e.key === "Enter" && !generandoIA) confirmarIA();
              }}
              placeholder="ej: corazon de neon fucsia estilo glitch"
              className="mb-3 w-full border-4 border-black bg-black px-2 py-1.5 text-xs text-punk-paper outline-none placeholder:text-punk-paper/30 focus:border-punk-cyan"
            />
            {errorIA && <p className="mb-3 text-[10px] text-punk-pink">{errorIA}</p>}
            <div className="flex gap-2">
              <button
                onClick={confirmarIA}
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
    </>
  );
}
