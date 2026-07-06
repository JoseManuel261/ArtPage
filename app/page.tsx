"use client";

import { useEffect, useMemo, useState } from "react";
import { Menu } from "lucide-react";
import SVGFilters from "@/components/SVGFilters";
import SidebarTableros from "@/components/SidebarTableros";
import StickerCanvas from "@/components/StickerCanvas";
import { supabase } from "@/lib/supabaseClient";
import { calcularEstadoAnimo } from "@/lib/colorAnalysis";
import type { Tablero } from "@/lib/types";

export default function Page() {
  const [tableros, setTableros] = useState<Tablero[]>([]);
  const [tableroActivo, setTableroActivo] = useState<Tablero | null>(null);
  const [cargandoLista, setCargandoLista] = useState(true);
  const [sidebarAbiertoMobile, setSidebarAbiertoMobile] = useState(false);
  const [paletaColores, setPaletaColores] = useState<string[]>([]);
  const [paletaEtiqueta, setPaletaEtiqueta] = useState<string>("");

  useEffect(() => {
    async function cargarTablerosIniciales() {
      const { data, error } = await supabase
        .from("tableros")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error cargando tableros:", error.message);
      } else if (data) {
        setTableros(data as Tablero[]);
        if (data.length > 0) setTableroActivo(data[0] as Tablero);
      }
      setCargandoLista(false);
    }

    cargarTablerosIniciales();
  }, []);

  useEffect(() => {
    setPaletaColores([]);
    setPaletaEtiqueta("");
  }, [tableroActivo?.id]);

  function handleTableroCreado(nuevo: Tablero) {
    setTableros((prev) => [...prev, nuevo]);
    setTableroActivo(nuevo);
    setSidebarAbiertoMobile(false);
  }

  function handleTableroEliminado(idEliminado: string) {
    setTableros((prev) => {
      const restantes = prev.filter((t) => t.id !== idEliminado);
      setTableroActivo((actual) =>
        actual?.id === idEliminado ? restantes[0] ?? null : actual
      );
      return restantes;
    });
  }

  const estadoGlobal = useMemo(
    () => calcularEstadoAnimo(paletaColores),
    [paletaColores]
  );

  return (
    <main
      className="relative flex h-screen w-screen overflow-hidden bg-punk-black"
      style={{ "--mood-glow": estadoGlobal.glow } as React.CSSProperties}
    >
      {/* Filtros SVG globales (duotono neon) */}
      <SVGFilters />

      {/* Efectos CRT / scanlines globales, tenidos con la paleta detectada */}
      <div className="crt-vignette" />
      <div className="crt-overlay" />
      <div className="crt-scanline-moving" />

      {/* Boton hamburguesa: solo visible en moviles, abre el drawer de tableros */}
      <button
        onClick={() => setSidebarAbiertoMobile(true)}
        className="fixed left-2 top-2 z-50 flex items-center justify-center border-2 border-punk-pink/70 bg-black/80 p-2 text-punk-cyan md:hidden"
        aria-label="Abrir panel de tableros"
      >
        <Menu className="h-4 w-4" />
      </button>

      {/* Cabecera flotante tipo terminal */}
      <div className="pointer-events-none absolute left-1/2 top-2 z-40 max-w-[70vw] -translate-x-1/2 truncate border-2 border-punk-pink/60 bg-black/80 px-2.5 py-1 font-mono text-[9px] tracking-[0.2em] text-punk-cyan sm:top-3 sm:px-4 sm:text-[10px] sm:tracking-[0.3em]">
        LIENZO_COLAGE.SYS — v1.0
      </div>

      <SidebarTableros
        tableros={tableros}
        tableroActivo={tableroActivo}
        onSeleccionar={setTableroActivo}
        onCreado={handleTableroCreado}
        onEliminado={handleTableroEliminado}
        abiertoMobile={sidebarAbiertoMobile}
        onCerrarMobile={() => setSidebarAbiertoMobile(false)}
        paletaColores={paletaColores}
        paletaEtiqueta={paletaEtiqueta}
      />

      {cargandoLista ? (
        <div className="flex flex-1 items-center justify-center font-mono text-sm text-punk-cyan">
          &gt; inicializando_sistema...
        </div>
      ) : (
        <StickerCanvas
          tablero={tableroActivo}
          onPaletaChange={(colores, etiqueta) => {
            setPaletaColores(colores);
            setPaletaEtiqueta(etiqueta);
          }}
        />
      )}
    </main>
  );
}
