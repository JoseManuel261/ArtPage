"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal, Plus, FolderOpen, Radio, X, Trash2, Lock } from "lucide-react";
import { supabase, STICKERS_BUCKET } from "@/lib/supabaseClient";
import { sonidos } from "@/lib/sonido";
import type { ModoTablero, Tablero, TemaVisual } from "@/lib/types";
import { MODOS_TABLERO, TEMAS_VISUALES } from "@/lib/types";

interface SidebarTablerosProps {
  tableros: Tablero[];
  tableroActivo: Tablero | null;
  onSeleccionar: (tablero: Tablero) => void;
  onCreado: (tablero: Tablero) => void;
  /** Se llama despues de eliminar un tablero, con su id. */
  onEliminado: (tableroId: string) => void;
  /** Controla si el drawer esta abierto en pantallas moviles (< md). */
  abiertoMobile: boolean;
  /** Se llama para cerrar el drawer en moviles (boton X, overlay, o al elegir un tablero). */
  onCerrarMobile: () => void;
  /** Colores dominantes detectados en el tablero activo (para la franja de paleta). */
  paletaColores?: string[];
  /** Etiqueta textual del estado de animo actual (ej. "fucsia pop"). */
  paletaEtiqueta?: string;
}

export default function SidebarTableros({
  tableros,
  tableroActivo,
  onSeleccionar,
  onCreado,
  onEliminado,
  abiertoMobile,
  onCerrarMobile,
  paletaColores = [],
  paletaEtiqueta,
}: SidebarTablerosProps) {
  const [creando, setCreando] = useState(false);
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [modoNuevo, setModoNuevo] = useState<ModoTablero>("collage");
  const [temaNuevo, setTemaNuevo] = useState<TemaVisual>("neon");
  const [fechaNueva, setFechaNueva] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [tableroAEliminar, setTableroAEliminar] = useState<Tablero | null>(null);
  const [eliminando, setEliminando] = useState(false);
  // Colapsar a "riel" angosto solo aplica en escritorio (md+).
  const [colapsadoEscritorio, setColapsadoEscritorio] = useState(false);

  async function handleCrearTablero() {
    const nombre = nombreNuevo.trim();
    if (!nombre) return;
    setGuardando(true);

    const { data, error } = await supabase
      .from("tableros")
      .insert({
        nombre,
        modo: modoNuevo,
        tema_visual: temaNuevo,
        fecha_revelacion: fechaNueva ? new Date(fechaNueva).toISOString() : null,
      })
      .select()
      .single();

    setGuardando(false);

    if (error) {
      console.error("Error creando tablero:", error.message);
      return;
    }
    if (data) {
      sonidos.subir();
      onCreado(data as Tablero);
      setNombreNuevo("");
      setModoNuevo("collage");
      setTemaNuevo("neon");
      setFechaNueva("");
      setCreando(false);
    }
  }

  function handleSeleccionar(t: Tablero) {
    sonidos.click();
    onSeleccionar(t);
    onCerrarMobile();
  }

  async function handleEliminarTablero(tablero: Tablero) {
    setEliminando(true);

    // Limpiamos las imagenes de Storage asociadas a este tablero antes
    // de borrar el registro (evita archivos huerfanos en el bucket).
    const { data: archivos } = await supabase.storage
      .from(STICKERS_BUCKET)
      .list(tablero.id);

    if (archivos && archivos.length > 0) {
      const rutas = archivos.map((a) => `${tablero.id}/${a.name}`);
      await supabase.storage.from(STICKERS_BUCKET).remove(rutas);
    }

    // Al borrar el tablero, los stickers se eliminan solos por el
    // "on delete cascade" definido en la base de datos.
    const { error } = await supabase
      .from("tableros")
      .delete()
      .eq("id", tablero.id);

    setEliminando(false);
    setTableroAEliminar(null);

    if (error) {
      console.error("Error eliminando tablero:", error.message);
      return;
    }

    sonidos.eliminar();
    onEliminado(tablero.id);
  }

  return (
    <>
      {/* Overlay oscuro detras del drawer, solo en moviles */}
      {abiertoMobile && (
        <div
          onClick={onCerrarMobile}
          className="fixed inset-0 z-30 bg-black/70 md:hidden"
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-full w-72 max-w-[85vw] flex-col border-r-4 border-black bg-punk-black font-mono text-punk-paper transition-transform duration-300 ease-in-out ${
          abiertoMobile ? "translate-x-0" : "-translate-x-full"
        } md:relative md:z-30 md:translate-x-0 md:max-w-none md:transition-[width] ${
          colapsadoEscritorio ? "md:w-14" : "md:w-72"
        }`}
      >
        {/* Barra de titulo estilo terminal */}
        <div className="flex items-center justify-between border-b-4 border-black bg-black px-3 py-3">
          {!colapsadoEscritorio && (
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 shrink-0 text-punk-cyan" />
              <span className="text-xs tracking-widest text-punk-cyan">
                /root/tableros_
              </span>
            </div>
          )}

          {/* Cerrar drawer: solo visible en moviles */}
          <button
            onClick={onCerrarMobile}
            className="ml-auto border-2 border-punk-pink px-1.5 py-0.5 text-[10px] text-punk-pink hover:bg-punk-pink hover:text-black md:hidden"
            aria-label="Cerrar panel"
          >
            <X className="h-3.5 w-3.5" />
          </button>

          {/* Colapsar a riel: solo visible en escritorio */}
          <button
            onClick={() => setColapsadoEscritorio((c) => !c)}
            className="ml-auto hidden border-2 border-punk-pink px-1.5 py-0.5 text-[10px] text-punk-pink hover:bg-punk-pink hover:text-black md:block"
            aria-label="Colapsar panel"
          >
            {colapsadoEscritorio ? ">" : "<"}
          </button>
        </div>

        {!colapsadoEscritorio && (
          <>
            {/* Paleta detectada del tablero activo */}
            {tableroActivo && paletaColores.length > 0 && (
              <div className="border-b-4 border-black bg-black/40 px-3 py-2.5">
                <p className="mb-1.5 text-[9px] uppercase tracking-[0.2em] text-punk-paper/50">
                  paleta_detectada
                </p>
                <div className="flex items-center gap-1.5">
                  {paletaColores.slice(0, 8).map((color, i) => (
                    <span
                      key={`${color}-${i}`}
                      className="h-4 w-4 shrink-0 border-2 border-black"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                  {paletaEtiqueta && (
                    <span className="ml-1 truncate text-[10px] text-punk-paper/70">
                      // {paletaEtiqueta}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Lista de tableros */}
            <div className="flex-1 space-y-2 overflow-y-auto p-3">
              <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-punk-pink/70">
                // lienzos_guardados ({tableros.length})
              </p>

              {tableros.length === 0 && (
                <p className="border-2 border-dashed border-punk-paper/30 p-3 text-[11px] text-punk-paper/50">
                  Sin tableros aun. Crea el primer lienzo para empezar a
                  intervenir el sistema.
                </p>
              )}

              {tableros.map((t) => {
                const activo = tableroActivo?.id === t.id;
                const bloqueado = t.fecha_revelacion && new Date(t.fecha_revelacion) > new Date();
                return (
                  <div
                    key={t.id}
                    className={`group flex w-full items-stretch gap-0 border-4 border-black shadow-[4px_4px_0px_#000] transition-transform hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_#000] ${
                      activo ? "bg-punk-pink text-black" : "bg-neutral-900 text-punk-paper"
                    }`}
                  >
                    <button
                      onClick={() => handleSeleccionar(t)}
                      className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left text-xs"
                    >
                      {activo ? (
                        <Radio className="h-3.5 w-3.5 shrink-0 animate-pulse" />
                      ) : (
                        <FolderOpen className="h-3.5 w-3.5 shrink-0 text-punk-cyan" />
                      )}
                      <span className="truncate">{t.nombre}</span>
                      {bloqueado && <Lock className="h-3 w-3 shrink-0 opacity-60" />}
                    </button>
                    <button
                      onClick={() => setTableroAEliminar(t)}
                      aria-label={`Eliminar tablero ${t.nombre}`}
                      className={`flex shrink-0 items-center justify-center border-l-4 border-black px-2 opacity-60 hover:opacity-100 ${
                        activo ? "hover:bg-black hover:text-punk-pink" : "hover:bg-punk-pink hover:text-black"
                      }`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Crear nuevo lienzo */}
            <div className="border-t-4 border-black p-3">
              <AnimatePresence mode="wait">
                {creando ? (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-punk-cyan">
                        nombre_del_lienzo.exe
                      </span>
                      <button
                        onClick={() => {
                          setCreando(false);
                          setNombreNuevo("");
                        }}
                        className="text-punk-pink hover:text-white"
                        aria-label="Cancelar"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <input
                      autoFocus
                      value={nombreNuevo}
                      onChange={(e) => setNombreNuevo(e.target.value)}
                      placeholder="ej: regalo_para_ale"
                      className="w-full border-4 border-black bg-black px-2 py-1.5 text-xs text-punk-cyan outline-none placeholder:text-punk-paper/30 focus:border-punk-cyan"
                    />

                    <p className="mt-2 text-[9px] uppercase tracking-wider text-punk-paper/50">
                      modo de interfaz
                    </p>
                    <div className="flex flex-col gap-1">
                      {MODOS_TABLERO.map((m) => (
                        <button
                          key={m.valor}
                          onClick={() => setModoNuevo(m.valor)}
                          className={`border-2 px-2 py-1 text-left text-[10px] ${
                            modoNuevo === m.valor
                              ? "border-punk-cyan bg-punk-cyan text-black"
                              : "border-punk-paper/30 text-punk-paper/70"
                          }`}
                        >
                          <span className="font-bold">{m.etiqueta}</span>
                          <span className="block text-[9px] opacity-70">{m.descripcion}</span>
                        </button>
                      ))}
                    </div>

                    <p className="mt-2 text-[9px] uppercase tracking-wider text-punk-paper/50">
                      tema visual
                    </p>
                    <div className="flex gap-1">
                      {TEMAS_VISUALES.map((t) => (
                        <button
                          key={t.valor}
                          onClick={() => setTemaNuevo(t.valor)}
                          className={`flex-1 border-2 px-2 py-1 text-[10px] ${
                            temaNuevo === t.valor
                              ? "border-punk-cyan bg-punk-cyan text-black"
                              : "border-punk-paper/30 text-punk-paper/70"
                          }`}
                        >
                          {t.etiqueta}
                        </button>
                      ))}
                    </div>

                    <p className="mt-2 flex items-center gap-1 text-[9px] uppercase tracking-wider text-punk-paper/50">
                      <Lock className="h-3 w-3" /> capsula del tiempo (opcional)
                    </p>
                    <input
                      type="datetime-local"
                      value={fechaNueva}
                      onChange={(e) => setFechaNueva(e.target.value)}
                      className="w-full border-2 border-punk-paper/30 bg-black px-2 py-1 text-[10px] text-punk-paper outline-none focus:border-punk-cyan"
                    />
                    {fechaNueva && (
                      <p className="text-[9px] text-punk-paper/50">
                        se bloqueara hasta esa fecha con cuenta regresiva
                      </p>
                    )}
                    <button
                      onClick={handleCrearTablero}
                      disabled={guardando || !nombreNuevo.trim()}
                      className="w-full border-4 border-black bg-punk-cyan px-2 py-1.5 text-[11px] font-bold text-black shadow-[4px_4px_0px_#000] hover:bg-punk-yellow disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {guardando ? "GUARDANDO..." : "CONFIRMAR"}
                    </button>
                  </motion.div>
                ) : (
                  <motion.button
                    key="cta"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={() => setCreando(true)}
                    className="glitch-btn relative flex w-full items-center justify-center gap-2 overflow-hidden border-4 border-black bg-punk-pink px-3 py-2 text-xs font-bold text-black shadow-[4px_4px_0px_#000] hover:shadow-[6px_6px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_#000]"
                  >
                    <Plus className="h-4 w-4" />
                    CREAR NUEVO LIENZO
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
            0% {
              clip-path: inset(0 0 0 0);
            }
            20% {
              clip-path: inset(20% 0 60% 0);
              transform: translate(-2px, 1px);
            }
            40% {
              clip-path: inset(60% 0 10% 0);
              transform: translate(2px, -1px);
            }
            60% {
              clip-path: inset(10% 0 70% 0);
              transform: translate(-1px, 2px);
            }
            100% {
              clip-path: inset(0 0 0 0);
              transform: translate(0, 0);
            }
          }
        `}</style>
      </aside>

      {/* Modal de confirmacion centrado: no depende del tamaño del panel */}
      {tableroAEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-xs border-4 border-black bg-neutral-900 p-4 font-mono shadow-[6px_6px_0px_#000]">
            <p className="mb-3 text-center text-xs text-punk-paper">
              ¿Eliminar el tablero <strong>"{tableroAEliminar.nombre}"</strong> y
              todas sus imagenes? Esta accion no se puede deshacer.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleEliminarTablero(tableroAEliminar)}
                disabled={eliminando}
                className="flex-1 border-2 border-black bg-punk-pink px-3 py-1.5 text-xs font-bold text-black disabled:opacity-50"
              >
                {eliminando ? "BORRANDO..." : "SI, BORRAR"}
              </button>
              <button
                onClick={() => setTableroAEliminar(null)}
                disabled={eliminando}
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
