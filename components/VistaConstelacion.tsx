"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ScanLine } from "lucide-react";
import type { Sticker, Tablero } from "@/lib/types";
import { useLienzo } from "@/lib/useLienzo";
import { useTema } from "@/lib/TemaContext";
import BarraCreacion from "./BarraCreacion";
import ModalEliminar from "./ModalEliminar";
import TarjetaSticker from "./TarjetaSticker";

interface VistaConstelacionProps {
  tablero: Tablero | null;
  onPaletaChange?: (colores: string[], etiqueta: string) => void;
}

interface Nodo {
  sticker: Sticker;
  x: number;
  y: number;
}

/**
 * Calcula una disposicion en espiral alrededor de un centro, para que
 * los recuerdos se sientan como una "constelacion" que crece con el
 * tiempo, en vez de depender de posiciones guardadas manualmente.
 */
function calcularLayoutEspiral(stickers: Sticker[], ancho: number, alto: number): Nodo[] {
  const cx = ancho / 2;
  const cy = alto / 2;
  const anguloDorado = 137.5 * (Math.PI / 180); // angulo dorado, distribucion organica
  const radioBase = 60;
  const radioPaso = 26;

  return stickers.map((sticker, i) => {
    const angulo = i * anguloDorado;
    const radio = radioBase + radioPaso * Math.sqrt(i);
    return {
      sticker,
      x: cx + radio * Math.cos(angulo),
      y: cy + radio * Math.sin(angulo),
    };
  });
}

export default function VistaConstelacion({ tablero, onPaletaChange }: VistaConstelacionProps) {
  const tema = useTema();
  const {
    stickers, cargando, subiendo, subirArchivoComoSticker, crearCartelitoTexto,
    generarConIA, eliminarSticker, cambiarFiltro, alternarFavorito, todosLosColores, estadoAnimo,
  } = useLienzo(tablero);

  const [stickerAEliminar, setStickerAEliminar] = useState<Sticker | null>(null);

  useMemo(() => {
    onPaletaChange?.(todosLosColores, estadoAnimo.etiqueta);
  }, [todosLosColores, estadoAnimo.etiqueta]);

  const ordenados = useMemo(
    () => [...stickers].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    [stickers]
  );

  // Lienzo virtual amplio: el layout en espiral crece hacia afuera, asi
  // que damos espacio de sobra y dejamos que el usuario haga scroll.
  const ANCHO_VIRTUAL = 1400;
  const ALTO_VIRTUAL = 1400;
  const nodos = useMemo(
    () => calcularLayoutEspiral(ordenados, ANCHO_VIRTUAL, ALTO_VIRTUAL),
    [ordenados]
  );

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
      <div className="relative z-20 flex items-start justify-between gap-2 p-3 sm:p-4">
        <BarraCreacion
          subiendo={subiendo}
          colorPrimario={estadoAnimo.primario}
          colorSecundario={estadoAnimo.secundario}
          onSubirArchivos={(files) => files.forEach(subirArchivoComoSticker)}
          onGenerarIA={generarConIA}
          onCrearTexto={crearCartelitoTexto}
        />
        <span
          className="shrink-0 px-2 py-1 text-[9px] sm:text-[10px]"
          style={{ backgroundColor: `${tema.superficie}dd`, color: tema.textoSuave, borderRadius: tema.bordeRadio / 3 }}
        >
          {tablero.nombre} · {ordenados.length} recuerdos conectados
        </span>
      </div>

      {cargando && (
        <div className="flex flex-1 items-center justify-center" style={{ color: tema.acentoSecundario }}>
          <ScanLine className="mr-2 h-4 w-4 animate-pulse" /> Cargando constelación...
        </div>
      )}

      {!cargando && ordenados.length === 0 && (
        <div className="flex flex-1 items-center justify-center px-6">
          <p className="max-w-xs px-6 py-8 text-center text-xs" style={{ color: tema.textoSuave, border: `2px dashed ${tema.textoSuave}33`, borderRadius: tema.bordeRadio }}>
            Aún no hay recuerdos para conectar.
          </p>
        </div>
      )}

      {!cargando && ordenados.length > 0 && (
        <div className="relative z-10 flex-1 overflow-auto">
          <div className="relative" style={{ width: ANCHO_VIRTUAL, height: ALTO_VIRTUAL }}>
            <svg
              className="pointer-events-none absolute inset-0"
              width={ANCHO_VIRTUAL}
              height={ALTO_VIRTUAL}
            >
              {nodos.slice(1).map((nodo, i) => {
                const anterior = nodos[i];
                return (
                  <line
                    key={`linea-${nodo.sticker.id}`}
                    x1={anterior.x}
                    y1={anterior.y}
                    x2={nodo.x}
                    y2={nodo.y}
                    stroke={nodo.sticker.dominant_color || estadoAnimo.primario}
                    strokeWidth={2}
                    strokeOpacity={0.5}
                    strokeDasharray="4 4"
                  />
                );
              })}
            </svg>

            {nodos.map(({ sticker, x, y }, i) => (
              <motion.div
                key={sticker.id}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04, type: "spring", stiffness: 220, damping: 20 }}
                style={{ position: "absolute", left: x, top: y, transform: "translate(-50%, -50%)" }}
              >
                <TarjetaSticker
                  sticker={sticker}
                  colorGlow={sticker.dominant_color || estadoAnimo.primario}
                  onCambiarFiltro={cambiarFiltro}
                  onEliminar={setStickerAEliminar}
                  onAlternarFavorito={alternarFavorito}
                />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      <ModalEliminar sticker={stickerAEliminar} onConfirmar={eliminarSticker} onCancelar={() => setStickerAEliminar(null)} />
    </div>
  );
}
