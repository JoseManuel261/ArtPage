"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal, Plus, FolderOpen, Radio, X } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import type { Tablero } from "@/lib/types";

interface SidebarTablerosProps {
  tableros: Tablero[];
  tableroActivo: Tablero | null;
  onSeleccionar: (tablero: Tablero) => void;
  onCreado: (tablero: Tablero) => void;
}

export default function SidebarTableros({
  tableros,
  tableroActivo,
  onSeleccionar,
  onCreado,
}: SidebarTablerosProps) {
  const [creando, setCreando] = useState(false);
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [colapsado, setColapsado] = useState(false);

  async function handleCrearTablero() {
    const nombre = nombreNuevo.trim();
    if (!nombre) return;
    setGuardando(true);

    const { data, error } = await supabase
      .from("tableros")
      .insert({ nombre })
      .select()
      .single();

    setGuardando(false);

    if (error) {
      console.error("Error creando tablero:", error.message);
      return;
    }
    if (data) {
      onCreado(data as Tablero);
      setNombreNuevo("");
      setCreando(false);
    }
  }

  return (
    <aside
      className={`relative z-30 flex h-full flex-col border-r-4 border-black bg-dedsec-black font-mono text-dedsec-paper transition-all duration-300 ${
        colapsado ? "w-14" : "w-72"
      }`}
    >
      {/* Barra de titulo estilo terminal */}
      <div className="flex items-center justify-between border-b-4 border-black bg-black px-3 py-3">
        {!colapsado && (
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-dedsec-cyan" />
            <span className="text-xs tracking-widest text-dedsec-cyan">
              /root/tableros_
            </span>
          </div>
        )}
        <button
          onClick={() => setColapsado((c) => !c)}
          className="ml-auto border-2 border-dedsec-fuchsia px-1.5 py-0.5 text-[10px] text-dedsec-fuchsia hover:bg-dedsec-fuchsia hover:text-black"
          aria-label="Colapsar panel"
        >
          {colapsado ? ">" : "<"}
        </button>
      </div>

      {!colapsado && (
        <>
          {/* Lista de tableros */}
          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-dedsec-fuchsia/70">
              // lienzos_guardados ({tableros.length})
            </p>

            {tableros.length === 0 && (
              <p className="border-2 border-dashed border-dedsec-paper/30 p-3 text-[11px] text-dedsec-paper/50">
                Sin tableros aun. Crea el primer lienzo para empezar a
                intervenir el sistema.
              </p>
            )}

            {tableros.map((t) => {
              const activo = tableroActivo?.id === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => onSeleccionar(t)}
                  className={`group flex w-full items-center gap-2 border-4 border-black px-3 py-2 text-left text-xs shadow-[4px_4px_0px_#000] transition-transform hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_#000] ${
                    activo
                      ? "bg-dedsec-fuchsia text-black"
                      : "bg-neutral-900 text-dedsec-paper"
                  }`}
                >
                  {activo ? (
                    <Radio className="h-3.5 w-3.5 shrink-0 animate-pulse" />
                  ) : (
                    <FolderOpen className="h-3.5 w-3.5 shrink-0 text-dedsec-cyan" />
                  )}
                  <span className="truncate">{t.nombre}</span>
                </button>
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
                    <span className="text-[10px] text-dedsec-cyan">
                      nombre_del_lienzo.exe
                    </span>
                    <button
                      onClick={() => {
                        setCreando(false);
                        setNombreNuevo("");
                      }}
                      className="text-dedsec-fuchsia hover:text-white"
                      aria-label="Cancelar"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <input
                    autoFocus
                    value={nombreNuevo}
                    onChange={(e) => setNombreNuevo(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCrearTablero();
                    }}
                    placeholder="ej: regalo_para_ale"
                    className="w-full border-4 border-black bg-black px-2 py-1.5 text-xs text-dedsec-cyan outline-none placeholder:text-dedsec-paper/30 focus:border-dedsec-cyan"
                  />
                  <button
                    onClick={handleCrearTablero}
                    disabled={guardando || !nombreNuevo.trim()}
                    className="w-full border-4 border-black bg-dedsec-cyan px-2 py-1.5 text-[11px] font-bold text-black shadow-[4px_4px_0px_#000] hover:bg-dedsec-yellow disabled:cursor-not-allowed disabled:opacity-40"
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
                  className="glitch-btn relative flex w-full items-center justify-center gap-2 overflow-hidden border-4 border-black bg-dedsec-fuchsia px-3 py-2 text-xs font-bold text-black shadow-[4px_4px_0px_#000] hover:shadow-[6px_6px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_#000]"
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
  );
}
