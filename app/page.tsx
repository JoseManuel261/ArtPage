"use client";

import { useEffect, useState } from "react";
import SVGFilters from "@/components/SVGFilters";
import SidebarTableros from "@/components/SidebarTableros";
import StickerCanvas from "@/components/StickerCanvas";
import { supabase } from "@/lib/supabaseClient";
import type { Tablero } from "@/lib/types";

export default function Page() {
  const [tableros, setTableros] = useState<Tablero[]>([]);
  const [tableroActivo, setTableroActivo] = useState<Tablero | null>(null);
  const [cargandoLista, setCargandoLista] = useState(true);

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

  function handleTableroCreado(nuevo: Tablero) {
    setTableros((prev) => [...prev, nuevo]);
    setTableroActivo(nuevo);
  }

  return (
    <main className="relative flex h-screen w-screen overflow-hidden bg-dedsec-black">
      {/* Filtros SVG globales (duotono DedSec) */}
      <SVGFilters />

      {/* Efectos CRT / scanlines globales */}
      <div className="crt-vignette" />
      <div className="crt-overlay" />
      <div className="crt-scanline-moving" />

      {/* Cabecera flotante tipo terminal */}
      <div className="pointer-events-none absolute left-1/2 top-3 z-40 -translate-x-1/2 border-2 border-dedsec-fuchsia/60 bg-black/80 px-4 py-1 font-mono text-[10px] tracking-[0.3em] text-dedsec-cyan">
        STICKER_BOMB.SYS — DEDSEC EDITION — v1.0
      </div>

      <SidebarTableros
        tableros={tableros}
        tableroActivo={tableroActivo}
        onSeleccionar={setTableroActivo}
        onCreado={handleTableroCreado}
      />

      {cargandoLista ? (
        <div className="flex flex-1 items-center justify-center font-mono text-sm text-dedsec-cyan">
          &gt; inicializando_sistema...
        </div>
      ) : (
        <StickerCanvas tablero={tableroActivo} />
      )}
    </main>
  );
}
