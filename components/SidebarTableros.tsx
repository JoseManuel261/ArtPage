"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Layers, Plus, FolderOpen, Radio, X, Trash2, Lock, Pencil } from "lucide-react";
import { supabase, STICKERS_BUCKET } from "@/lib/supabaseClient";
import { sonidos } from "@/lib/sonido";
import { useTema } from "@/lib/TemaContext";
import type { ModoTablero, Tablero, TemaVisual } from "@/lib/types";
import { MODOS_TABLERO, TEMAS_VISUALES } from "@/lib/types";

interface SidebarTablerosProps {
  tableros: Tablero[];
  tableroActivo: Tablero | null;
  onSeleccionar: (tablero: Tablero) => void;
  onCreado: (tablero: Tablero) => void;
  onEliminado: (tableroId: string) => void;
  onActualizado: (tablero: Tablero) => void;
  abiertoMobile: boolean;
  onCerrarMobile: () => void;
  paletaColores?: string[];
  paletaEtiqueta?: string;
}

interface FormularioTablero {
  nombre: string;
  modo: ModoTablero;
  tema_visual: TemaVisual;
  fecha_revelacion: string;
  dedicatoria: string;
}

const FORM_VACIO: FormularioTablero = {
  nombre: "",
  modo: "collage",
  tema_visual: "minimal",
  fecha_revelacion: "",
  dedicatoria: "",
};

export default function SidebarTableros({
  tableros,
  tableroActivo,
  onSeleccionar,
  onCreado,
  onEliminado,
  onActualizado,
  abiertoMobile,
  onCerrarMobile,
  paletaColores = [],
  paletaEtiqueta,
}: SidebarTablerosProps) {
  const tema = useTema();
  const [creando, setCreando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<FormularioTablero>(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [tableroAEliminar, setTableroAEliminar] = useState<Tablero | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [colapsadoEscritorio, setColapsadoEscritorio] = useState(false);

  const t = tema.etiquetasTerminal;

  function abrirCreacion() {
    setForm(FORM_VACIO);
    setEditandoId(null);
    setCreando(true);
  }

  function abrirEdicion(tablero: Tablero) {
    setForm({
      nombre: tablero.nombre,
      modo: tablero.modo,
      tema_visual: tablero.tema_visual,
      fecha_revelacion: tablero.fecha_revelacion ? tablero.fecha_revelacion.slice(0, 16) : "",
      dedicatoria: tablero.dedicatoria || "",
    });
    setEditandoId(tablero.id);
    setCreando(true);
  }

  function cerrarFormulario() {
    setCreando(false);
    setEditandoId(null);
    setForm(FORM_VACIO);
  }

  async function handleGuardar() {
    const nombre = form.nombre.trim();
    if (!nombre) return;
    setGuardando(true);

    const payload = {
      nombre,
      modo: form.modo,
      tema_visual: form.tema_visual,
      fecha_revelacion: form.fecha_revelacion ? new Date(form.fecha_revelacion).toISOString() : null,
      dedicatoria: form.dedicatoria.trim() || null,
    };

    if (editandoId) {
      const { data, error } = await supabase
        .from("tableros")
        .update(payload)
        .eq("id", editandoId)
        .select()
        .single();

      setGuardando(false);
      if (error) {
        console.error("Error actualizando tablero:", error.message);
        return;
      }
      if (data) {
        sonidos.click();
        onActualizado(data as Tablero);
        cerrarFormulario();
      }
    } else {
      const { data, error } = await supabase.from("tableros").insert(payload).select().single();

      setGuardando(false);
      if (error) {
        console.error("Error creando tablero:", error.message);
        return;
      }
      if (data) {
        sonidos.subir();
        onCreado(data as Tablero);
        cerrarFormulario();
      }
    }
  }

  function handleSeleccionar(tab: Tablero) {
    sonidos.click();
    onSeleccionar(tab);
    onCerrarMobile();
  }

  async function handleEliminarTablero(tablero: Tablero) {
    setEliminando(true);

    const { data: archivos } = await supabase.storage.from(STICKERS_BUCKET).list(tablero.id);
    if (archivos && archivos.length > 0) {
      const rutas = archivos.map((a) => `${tablero.id}/${a.name}`);
      await supabase.storage.from(STICKERS_BUCKET).remove(rutas);
    }

    const { error } = await supabase.from("tableros").delete().eq("id", tablero.id);

    setEliminando(false);
    setTableroAEliminar(null);

    if (error) {
      console.error("Error eliminando tablero:", error.message);
      return;
    }

    sonidos.eliminar();
    onEliminado(tablero.id);
  }

  const estiloBorde = { borderWidth: tema.bordeGrosor, borderColor: tema.efectosRetro ? "#000" : `${tema.textoSuave}` };
  const estiloTarjeta = {
    borderWidth: tema.bordeGrosor,
    borderStyle: "solid" as const,
    borderColor: tema.efectosRetro ? "#000" : "transparent",
    borderRadius: tema.bordeRadio,
    boxShadow: tema.sombraChica,
    backgroundColor: tema.superficie,
  };

  return (
    <>
      {abiertoMobile && (
        <div onClick={onCerrarMobile} className="fixed inset-0 z-30 bg-black/60 md:hidden" aria-hidden="true" />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-full w-72 max-w-[85vw] flex-col transition-transform duration-300 ease-in-out ${
          abiertoMobile ? "translate-x-0" : "-translate-x-full"
        } md:relative md:z-30 md:translate-x-0 md:max-w-none md:transition-[width] ${
          colapsadoEscritorio ? "md:w-14" : "md:w-72"
        }`}
        style={{
          backgroundColor: tema.superficie,
          borderRight: `${tema.bordeGrosor}px solid ${tema.efectosRetro ? "#000" : `${tema.textoSuave}33`}`,
          color: tema.texto,
          fontFamily: tema.fuenteUI,
        }}
      >
        <div
          className="flex items-center justify-between px-3 py-3"
          style={{ borderBottom: `${tema.bordeGrosor}px solid ${tema.efectosRetro ? "#000" : `${tema.textoSuave}22`}` }}
        >
          {!colapsadoEscritorio && (
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 shrink-0" style={{ color: tema.acento }} />
              <span
                className="text-xs"
                style={{ color: tema.acento, letterSpacing: t ? "0.15em" : "normal", textTransform: t ? "uppercase" : "none" }}
              >
                {t ? "/root/tableros_" : "Tus tableros"}
              </span>
            </div>
          )}

          <button
            onClick={onCerrarMobile}
            className="ml-auto p-1 md:hidden"
            style={{ color: tema.acento }}
            aria-label="Cerrar panel"
          >
            <X className="h-4 w-4" />
          </button>

          <button
            onClick={() => setColapsadoEscritorio((c) => !c)}
            className="ml-auto hidden p-1 text-xs md:block"
            style={{ color: tema.acento }}
            aria-label="Colapsar panel"
          >
            {colapsadoEscritorio ? ">" : "<"}
          </button>
        </div>

        {!colapsadoEscritorio && (
          <>
            {tableroActivo && paletaColores.length > 0 && (
              <div
                className="px-3 py-2.5"
                style={{ borderBottom: `${tema.bordeGrosor}px solid ${tema.efectosRetro ? "#000" : `${tema.textoSuave}22`}` }}
              >
                <p
                  className="mb-1.5 text-[9px] uppercase tracking-[0.15em]"
                  style={{ color: tema.textoSuave }}
                >
                  {t ? "paleta_detectada" : "Paleta detectada"}
                </p>
                <div className="flex items-center gap-1.5">
                  {paletaColores.slice(0, 8).map((color, i) => (
                    <span
                      key={`${color}-${i}`}
                      className="h-4 w-4 shrink-0"
                      style={{ backgroundColor: color, borderRadius: tema.bordeRadio / 4, border: `1px solid ${tema.efectosRetro ? "#000" : "transparent"}` }}
                    />
                  ))}
                  {paletaEtiqueta && (
                    <span className="ml-1 truncate text-[10px]" style={{ color: tema.textoSuave }}>
                      {paletaEtiqueta}
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="flex-1 space-y-2 overflow-y-auto p-3">
              <p className="mb-1 text-[10px] uppercase tracking-[0.15em]" style={{ color: `${tema.textoSuave}` }}>
                {t ? `// lienzos_guardados (${tableros.length})` : `${tableros.length} tablero${tableros.length === 1 ? "" : "s"}`}
              </p>

              {tableros.length === 0 && (
                <p
                  className="p-3 text-[11px]"
                  style={{ color: tema.textoSuave, border: `2px dashed ${tema.textoSuave}44`, borderRadius: tema.bordeRadio }}
                >
                  Aun no hay tableros. Crea el primero para empezar.
                </p>
              )}

              {tableros.map((tab) => {
                const activo = tableroActivo?.id === tab.id;
                const bloqueado = tab.fecha_revelacion && new Date(tab.fecha_revelacion) > new Date();
                return (
                  <div
                    key={tab.id}
                    className="group flex w-full items-stretch overflow-hidden transition-transform hover:-translate-y-0.5"
                    style={{
                      ...estiloTarjeta,
                      backgroundColor: activo ? tema.acento : tema.superficie,
                      color: activo ? tema.fondo : tema.texto,
                    }}
                  >
                    <button
                      onClick={() => handleSeleccionar(tab)}
                      className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left text-xs"
                    >
                      {activo ? (
                        <Radio className="h-3.5 w-3.5 shrink-0 animate-pulse" />
                      ) : (
                        <FolderOpen className="h-3.5 w-3.5 shrink-0" style={{ color: tema.acentoSecundario }} />
                      )}
                      <span className="truncate">{tab.nombre}</span>
                      {bloqueado && <Lock className="h-3 w-3 shrink-0 opacity-60" />}
                    </button>
                    <button
                      onClick={() => abrirEdicion(tab)}
                      aria-label={`Editar ${tab.nombre}`}
                      className="flex shrink-0 items-center justify-center px-2 opacity-50 hover:opacity-100"
                      style={{ borderLeft: `${tema.bordeGrosor}px solid ${tema.efectosRetro ? "#000" : `${activo ? tema.fondo : tema.textoSuave}22`}` }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setTableroAEliminar(tab)}
                      aria-label={`Eliminar ${tab.nombre}`}
                      className="flex shrink-0 items-center justify-center px-2 opacity-50 hover:opacity-100"
                      style={{ borderLeft: `${tema.bordeGrosor}px solid ${tema.efectosRetro ? "#000" : `${activo ? tema.fondo : tema.textoSuave}22`}` }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="p-3" style={{ borderTop: `${tema.bordeGrosor}px solid ${tema.efectosRetro ? "#000" : `${tema.textoSuave}22`}` }}>
              <AnimatePresence mode="wait">
                {creando ? (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="max-h-[70vh] space-y-2 overflow-y-auto"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px]" style={{ color: tema.acento }}>
                        {editandoId ? "Editar tablero" : t ? "nombre_del_lienzo.exe" : "Nuevo tablero"}
                      </span>
                      <button onClick={cerrarFormulario} style={{ color: tema.acento }} aria-label="Cancelar">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <input
                      autoFocus
                      value={form.nombre}
                      onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                      placeholder="ej: regalo para ale"
                      className="w-full px-2 py-1.5 text-xs outline-none"
                      style={{
                        ...estiloBorde,
                        borderStyle: "solid",
                        borderRadius: tema.bordeRadio / 2,
                        backgroundColor: tema.fondo,
                        color: tema.texto,
                      }}
                    />

                    <p className="mt-2 text-[9px] uppercase tracking-wider" style={{ color: tema.textoSuave }}>
                      Modo de interfaz
                    </p>
                    <div className="flex flex-col gap-1">
                      {MODOS_TABLERO.map((m) => (
                        <button
                          key={m.valor}
                          onClick={() => setForm((f) => ({ ...f, modo: m.valor }))}
                          className="px-2 py-1 text-left text-[10px]"
                          style={{
                            borderWidth: tema.bordeGrosor > 2 ? 2 : tema.bordeGrosor,
                            borderStyle: "solid",
                            borderRadius: tema.bordeRadio / 2,
                            borderColor: form.modo === m.valor ? tema.acento : `${tema.textoSuave}44`,
                            backgroundColor: form.modo === m.valor ? tema.acento : "transparent",
                            color: form.modo === m.valor ? tema.fondo : tema.textoSuave,
                          }}
                        >
                          <span className="font-bold">{m.etiqueta}</span>
                          <span className="block text-[9px] opacity-80">{m.descripcion}</span>
                        </button>
                      ))}
                    </div>

                    <p className="mt-2 text-[9px] uppercase tracking-wider" style={{ color: tema.textoSuave }}>
                      Tema visual
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {TEMAS_VISUALES.map((op) => (
                        <button
                          key={op.valor}
                          onClick={() => setForm((f) => ({ ...f, tema_visual: op.valor }))}
                          className="flex-1 px-2 py-1 text-[10px]"
                          style={{
                            borderWidth: tema.bordeGrosor > 2 ? 2 : tema.bordeGrosor,
                            borderStyle: "solid",
                            borderRadius: tema.bordeRadio / 2,
                            borderColor: form.tema_visual === op.valor ? tema.acento : `${tema.textoSuave}44`,
                            backgroundColor: form.tema_visual === op.valor ? tema.acento : "transparent",
                            color: form.tema_visual === op.valor ? tema.fondo : tema.textoSuave,
                          }}
                        >
                          {op.etiqueta}
                        </button>
                      ))}
                    </div>

                    <p className="mt-2 flex items-center gap-1 text-[9px] uppercase tracking-wider" style={{ color: tema.textoSuave }}>
                      <Lock className="h-3 w-3" /> Cápsula del tiempo (opcional)
                    </p>
                    <input
                      type="datetime-local"
                      value={form.fecha_revelacion}
                      onChange={(e) => setForm((f) => ({ ...f, fecha_revelacion: e.target.value }))}
                      className="w-full px-2 py-1 text-[10px] outline-none"
                      style={{
                        borderWidth: 1,
                        borderStyle: "solid",
                        borderColor: `${tema.textoSuave}44`,
                        borderRadius: tema.bordeRadio / 2,
                        backgroundColor: tema.fondo,
                        color: tema.texto,
                      }}
                    />
                    {form.fecha_revelacion && (
                      <p className="text-[9px]" style={{ color: tema.textoSuave }}>
                        Se bloqueará hasta esa fecha con cuenta regresiva.
                      </p>
                    )}

                    <p className="mt-2 text-[9px] uppercase tracking-wider" style={{ color: tema.textoSuave }}>
                      Dedicatoria (opcional)
                    </p>
                    <textarea
                      value={form.dedicatoria}
                      onChange={(e) => setForm((f) => ({ ...f, dedicatoria: e.target.value.slice(0, 400) }))}
                      placeholder="un mensaje que se revele al abrir el tablero..."
                      rows={2}
                      className="w-full resize-none px-2 py-1 text-[10px] outline-none"
                      style={{
                        borderWidth: 1,
                        borderStyle: "solid",
                        borderColor: `${tema.textoSuave}44`,
                        borderRadius: tema.bordeRadio / 2,
                        backgroundColor: tema.fondo,
                        color: tema.texto,
                      }}
                    />

                    <button
                      onClick={handleGuardar}
                      disabled={guardando || !form.nombre.trim()}
                      className="w-full py-1.5 text-[11px] font-bold disabled:cursor-not-allowed disabled:opacity-40"
                      style={{
                        backgroundColor: tema.acento,
                        color: tema.fondo,
                        borderRadius: tema.bordeRadio / 2,
                        boxShadow: tema.sombraChica,
                      }}
                    >
                      {guardando ? "Guardando..." : editandoId ? "Guardar cambios" : "Crear tablero"}
                    </button>
                  </motion.div>
                ) : (
                  <motion.button
                    key="cta"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={abrirCreacion}
                    className={`relative flex w-full items-center justify-center gap-2 overflow-hidden py-2 text-xs font-bold ${
                      tema.efectosRetro ? "glitch-btn" : ""
                    }`}
                    style={{
                      backgroundColor: tema.acento,
                      color: tema.fondo,
                      borderRadius: tema.bordeRadio / 2,
                      boxShadow: tema.sombra,
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    {t ? "CREAR NUEVO LIENZO" : "Nuevo tablero"}
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </>
        )}

        <style jsx>{`
          .glitch-btn:hover {
            animation: glitch-text 0.3s steps(2) infinite;
          }
          @keyframes glitch-text {
            0% { clip-path: inset(0 0 0 0); }
            20% { clip-path: inset(20% 0 60% 0); transform: translate(-2px, 1px); }
            40% { clip-path: inset(60% 0 10% 0); transform: translate(2px, -1px); }
            60% { clip-path: inset(10% 0 70% 0); transform: translate(-1px, 2px); }
            100% { clip-path: inset(0 0 0 0); transform: translate(0, 0); }
          }
        `}</style>
      </aside>

      {tableroAEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div
            className="w-full max-w-xs p-4"
            style={{ backgroundColor: tema.superficie, borderRadius: tema.bordeRadio, boxShadow: tema.sombra, color: tema.texto }}
          >
            <p className="mb-3 text-center text-xs">
              ¿Eliminar el tablero <strong>"{tableroAEliminar.nombre}"</strong> y todas sus imágenes?
              Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleEliminarTablero(tableroAEliminar)}
                disabled={eliminando}
                className="flex-1 py-1.5 text-xs font-bold disabled:opacity-50"
                style={{ backgroundColor: tema.acento, color: tema.fondo, borderRadius: tema.bordeRadio / 2 }}
              >
                {eliminando ? "Borrando..." : "Sí, borrar"}
              </button>
              <button
                onClick={() => setTableroAEliminar(null)}
                disabled={eliminando}
                className="flex-1 py-1.5 text-xs"
                style={{ border: `1px solid ${tema.textoSuave}66`, color: tema.textoSuave, borderRadius: tema.bordeRadio / 2 }}
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
