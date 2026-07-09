"use client";

import { useState } from "react";
import { Upload, Loader2, Sparkles, Type } from "lucide-react";
import { FUENTES_CARTELITO } from "@/lib/types";
import { useTema } from "@/lib/TemaContext";

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
 * Barra de herramientas compartida entre los 5 modos de interfaz:
 * cargar imagen, generar con IA (Pollinations, gratis) y añadir un
 * cartelito de texto. Se adapta al tema visual activo (colores,
 * bordes, tipografia, lenguaje terminal vs simple).
 */
export default function BarraCreacion({
  subiendo,
  colorPrimario,
  colorSecundario,
  onSubirArchivos,
  onGenerarIA,
  onCrearTexto,
}: BarraCreacionProps) {
  const tema = useTema();
  const t = tema.etiquetasTerminal;

  const [arrastrando, setArrastrando] = useState(false);
  const [mostrarTexto, setMostrarTexto] = useState(false);
  const [textoNuevo, setTextoNuevo] = useState("");
  const [fuenteNueva, setFuenteNueva] = useState<string>(FUENTES_CARTELITO[0].valor);
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
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : "No se pudo generar la imagen.";
      setErrorIA(mensaje);
    } finally {
      setGenerandoIA(false);
    }
  }

  const estiloBotonBase = {
    borderWidth: tema.bordeGrosor,
    borderStyle: "solid" as const,
    borderColor: tema.efectosRetro ? "#000" : "transparent",
    borderRadius: tema.bordeRadio / 2,
    boxShadow: tema.sombraChica,
    fontFamily: tema.fuenteUI,
  };

  const estiloModal = {
    backgroundColor: tema.superficie,
    borderRadius: tema.bordeRadio,
    boxShadow: tema.sombra,
    color: tema.texto,
    fontFamily: tema.fuenteUI,
  };

  const estiloInput = {
    backgroundColor: tema.fondo,
    color: tema.texto,
    border: `1px solid ${tema.textoSuave}44`,
    borderRadius: tema.bordeRadio / 2,
  };

  return (
    <>
      <div className="pointer-events-auto flex flex-wrap gap-1.5">
        <label
          className="flex cursor-pointer items-center gap-1.5 px-2 py-2 text-[10px] font-bold transition-colors sm:px-3 sm:text-[11px]"
          style={{ ...estiloBotonBase, backgroundColor: arrastrando ? colorSecundario : colorPrimario, color: "#0a0a0a" }}
        >
          {subiendo ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : <Upload className="h-4 w-4 shrink-0" />}
          <span className="hidden sm:inline">
            {subiendo ? (t ? "ANALIZANDO..." : "Analizando...") : t ? "CARGAR_IMAGEN.exe" : "Subir foto"}
          </span>
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
          className="flex items-center gap-1.5 px-2 py-2 text-[10px] font-bold sm:px-3 sm:text-[11px]"
          style={{ ...estiloBotonBase, backgroundColor: tema.superficie, color: tema.texto, border: `${tema.bordeGrosor}px solid ${tema.acentoSecundario}` }}
        >
          <Sparkles className="h-4 w-4 shrink-0" style={{ color: tema.acentoSecundario }} />
          <span className="hidden sm:inline">{t ? "GENERAR_IA.exe" : "Generar con IA"}</span>
        </button>

        <button
          onClick={() => setMostrarTexto(true)}
          className="flex items-center gap-1.5 px-2 py-2 text-[10px] font-bold sm:px-3 sm:text-[11px]"
          style={{ ...estiloBotonBase, backgroundColor: tema.superficie, color: tema.texto, border: `${tema.bordeGrosor}px solid ${tema.acento}` }}
        >
          <Type className="h-4 w-4 shrink-0" style={{ color: tema.acento }} />
          <span className="hidden sm:inline">{t ? "AÑADIR_TEXTO.exe" : "Añadir texto"}</span>
        </button>
      </div>

      {mostrarTexto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm p-4" style={estiloModal}>
            <p className="mb-2 text-xs" style={{ color: tema.acento }}>
              {t ? "nuevo_cartelito.txt" : "Nuevo cartelito"}
            </p>
            <textarea
              autoFocus
              value={textoNuevo}
              onChange={(e) => setTextoNuevo(e.target.value.slice(0, 140))}
              placeholder="Escribe tu mensaje..."
              rows={3}
              className="mb-3 w-full resize-none px-2 py-1.5 text-sm outline-none"
              style={{ ...estiloInput, fontFamily: fuenteNueva }}
            />
            <p className="mb-1 text-[10px] uppercase tracking-wider" style={{ color: tema.textoSuave }}>
              Tipografía
            </p>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {FUENTES_CARTELITO.map((f) => (
                <button
                  key={f.valor}
                  onClick={() => setFuenteNueva(f.valor)}
                  className="px-2 py-1 text-[11px]"
                  style={{
                    fontFamily: f.valor,
                    border: `1px solid ${fuenteNueva === f.valor ? tema.acento : `${tema.textoSuave}44`}`,
                    backgroundColor: fuenteNueva === f.valor ? tema.acento : "transparent",
                    color: fuenteNueva === f.valor ? tema.fondo : tema.textoSuave,
                    borderRadius: tema.bordeRadio / 3,
                  }}
                >
                  {f.etiqueta}
                </button>
              ))}
            </div>
            <p className="mb-1 text-[10px] uppercase tracking-wider" style={{ color: tema.textoSuave }}>
              Color de fondo
            </p>
            <div className="mb-4 flex gap-1.5">
              {COLORES_CARTELITO.map((c) => (
                <button
                  key={c}
                  onClick={() => setColorNuevo(c)}
                  aria-label={`Color ${c}`}
                  className="h-7 w-7"
                  style={{
                    backgroundColor: c,
                    border: `2px solid ${colorNuevo === c ? tema.acento : "transparent"}`,
                    borderRadius: tema.bordeRadio / 3,
                  }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={confirmarTexto}
                disabled={!textoNuevo.trim()}
                className="flex-1 px-3 py-1.5 text-xs font-bold disabled:opacity-40"
                style={{ backgroundColor: tema.acento, color: tema.fondo, borderRadius: tema.bordeRadio / 2 }}
              >
                Añadir al lienzo
              </button>
              <button
                onClick={() => {
                  setMostrarTexto(false);
                  setTextoNuevo("");
                }}
                className="flex-1 px-3 py-1.5 text-xs"
                style={{ border: `1px solid ${tema.textoSuave}44`, color: tema.textoSuave, borderRadius: tema.bordeRadio / 2 }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {mostrarIA && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm p-4" style={estiloModal}>
            <p className="mb-1 flex items-center gap-1.5 text-xs" style={{ color: tema.acentoSecundario }}>
              <Sparkles className="h-3.5 w-3.5" /> {t ? "generar_imagen_ia.exe" : "Generar con IA"}
            </p>
            <p className="mb-2 text-[10px]" style={{ color: tema.textoSuave }}>
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
              placeholder="ej: corazón de neón fucsia estilo glitch"
              className="mb-3 w-full px-2 py-1.5 text-xs outline-none"
              style={estiloInput}
            />
            {errorIA && (
              <p className="mb-3 text-[10px]" style={{ color: tema.acento }}>
                {errorIA}
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={confirmarIA}
                disabled={generandoIA || !promptIA.trim()}
                className="flex flex-1 items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold disabled:opacity-40"
                style={{ backgroundColor: tema.acentoSecundario, color: tema.fondo, borderRadius: tema.bordeRadio / 2 }}
              >
                {generandoIA ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Generando...
                  </>
                ) : (
                  "Generar"
                )}
              </button>
              <button
                onClick={() => {
                  setMostrarIA(false);
                  setPromptIA("");
                  setErrorIA(null);
                }}
                disabled={generandoIA}
                className="flex-1 px-3 py-1.5 text-xs"
                style={{ border: `1px solid ${tema.textoSuave}44`, color: tema.textoSuave, borderRadius: tema.bordeRadio / 2 }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
