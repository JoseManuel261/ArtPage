"use client";

import { useCallback, useEffect, useState } from "react";
import { Menu } from "lucide-react";
import SVGFilters from "@/components/SVGFilters";
import SidebarTableros from "@/components/SidebarTableros";
import StickerCanvas from "@/components/StickerCanvas";
import VistaAlbum from "@/components/VistaAlbum";
import VistaTimeline from "@/components/VistaTimeline";
import VistaPresentacion from "@/components/VistaPresentacion";
import VistaConstelacion from "@/components/VistaConstelacion";
import CapsulaTiempo from "@/components/CapsulaTiempo";
import DedicatoriaReveal from "@/components/DedicatoriaReveal";
import { supabase } from "@/lib/supabaseClient";
import { TemaProvider, useTema } from "@/lib/TemaContext";
import type { Tablero } from "@/lib/types";

/**
 * Componente raiz: administra los datos (tableros, seleccion activa)
 * y envuelve todo en el TemaProvider correcto — el tema visual del
 * TABLERO ACTIVO, no uno fijo. Asi, cambiar de tablero cambia toda la
 * interfaz (colores, tipografia, bordes) de verdad.
 */
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

  function handleTableroActualizado(actualizado: Tablero) {
    setTableros((prev) => prev.map((t) => (t.id === actualizado.id ? actualizado : t)));
    setTableroActivo((actual) => (actual?.id === actualizado.id ? actualizado : actual));
  }

  return (
    // El tema visual depende del tablero activo. Si no hay ninguno
    // seleccionado todavia, usamos "minimal" como tema neutro de espera.
    <TemaProvider tema={tableroActivo?.tema_visual ?? "minimal"}>
      <ContenidoPagina
        tableros={tableros}
        tableroActivo={tableroActivo}
        cargandoLista={cargandoLista}
        sidebarAbiertoMobile={sidebarAbiertoMobile}
        paletaColores={paletaColores}
        paletaEtiqueta={paletaEtiqueta}
        setTableroActivo={setTableroActivo}
        setSidebarAbiertoMobile={setSidebarAbiertoMobile}
        setPaletaColores={setPaletaColores}
        setPaletaEtiqueta={setPaletaEtiqueta}
        onTableroCreado={handleTableroCreado}
        onTableroEliminado={handleTableroEliminado}
        onTableroActualizado={handleTableroActualizado}
      />
    </TemaProvider>
  );
}

interface ContenidoPaginaProps {
  tableros: Tablero[];
  tableroActivo: Tablero | null;
  cargandoLista: boolean;
  sidebarAbiertoMobile: boolean;
  paletaColores: string[];
  paletaEtiqueta: string;
  setTableroActivo: (t: Tablero) => void;
  setSidebarAbiertoMobile: (v: boolean) => void;
  setPaletaColores: (v: string[]) => void;
  setPaletaEtiqueta: (v: string) => void;
  onTableroCreado: (t: Tablero) => void;
  onTableroEliminado: (id: string) => void;
  onTableroActualizado: (t: Tablero) => void;
}

/** Componente presentacional: consume el tema activo via useTema() y arma la UI. */
function ContenidoPagina({
  tableros,
  tableroActivo,
  cargandoLista,
  sidebarAbiertoMobile,
  paletaColores,
  paletaEtiqueta,
  setTableroActivo,
  setSidebarAbiertoMobile,
  setPaletaColores,
  setPaletaEtiqueta,
  onTableroCreado,
  onTableroEliminado,
  onTableroActualizado,
}: ContenidoPaginaProps) {
  const tema = useTema();

  const manejarPaletaChange = useCallback(
    (colores: string[], etiqueta: string) => {
      setPaletaColores(colores);
      setPaletaEtiqueta(etiqueta);
    },
    [setPaletaColores, setPaletaEtiqueta]
  );

  const vistaProps = {
    tablero: tableroActivo,
    onPaletaChange: manejarPaletaChange,
  };

  return (
    <main
      className="relative flex h-screen w-screen overflow-hidden transition-colors duration-500"
      style={{ backgroundColor: tema.fondo, color: tema.texto, fontFamily: tema.fuenteUI }}
    >
      <SVGFilters />

      {/* Efectos retro (scanlines/vignette/grano): solo en el tema Neon */}
      {tema.efectosRetro && (
        <>
          <div className="crt-vignette" />
          <div className="crt-overlay" />
          <div className="crt-scanline-moving" />
        </>
      )}

      {/* Boton hamburguesa: solo visible en moviles, abre el drawer de tableros */}
      <button
        onClick={() => setSidebarAbiertoMobile(true)}
        className="fixed left-2 top-2 z-50 flex items-center justify-center p-2 md:hidden"
        style={{
          border: `2px solid ${tema.acento}`,
          backgroundColor: tema.superficie,
          color: tema.acento,
          borderRadius: tema.bordeRadio / 2,
        }}
        aria-label="Abrir panel de tableros"
      >
        <Menu className="h-4 w-4" />
      </button>

      {/* Cabecera flotante, minimalista por defecto */}
      {tableroActivo && (
        <div
          className="pointer-events-none absolute left-1/2 top-2 z-40 max-w-[70vw] -translate-x-1/2 truncate px-3 py-1 text-sm sm:top-3"
          style={{
            backgroundColor: tema.superficie,
            color: tema.textoSuave,
            border: tema.efectosRetro ? `2px solid ${tema.acento}99` : "none",
            borderRadius: tema.bordeRadio / 2,
            boxShadow: tema.efectosRetro ? "none" : tema.sombraChica,
            letterSpacing: tema.efectosRetro ? "0.2em" : "normal",
            textTransform: tema.efectosRetro ? "uppercase" : "none",
            fontFamily: tema.fuenteAcento,
            fontSize: tema.efectosRetro ? "11px" : undefined,
          }}
        >
          {tableroActivo.nombre}
        </div>
      )}

      <SidebarTableros
        tableros={tableros}
        tableroActivo={tableroActivo}
        onSeleccionar={setTableroActivo}
        onCreado={onTableroCreado}
        onEliminado={onTableroEliminado}
        onActualizado={onTableroActualizado}
        abiertoMobile={sidebarAbiertoMobile}
        onCerrarMobile={() => setSidebarAbiertoMobile(false)}
        paletaColores={paletaColores}
        paletaEtiqueta={paletaEtiqueta}
      />

      {cargandoLista ? (
        <div className="flex flex-1 items-center justify-center text-sm" style={{ color: tema.textoSuave }}>
          cargando...
        </div>
      ) : tableroActivo?.fecha_revelacion && new Date(tableroActivo.fecha_revelacion) > new Date() ? (
        <CapsulaTiempo
          fechaRevelacion={tableroActivo.fecha_revelacion}
          nombreTablero={tableroActivo.nombre}
        />
      ) : tableroActivo?.modo === "album" ? (
        <VistaAlbum {...vistaProps} />
      ) : tableroActivo?.modo === "timeline" ? (
        <VistaTimeline {...vistaProps} />
      ) : tableroActivo?.modo === "presentacion" ? (
        <VistaPresentacion {...vistaProps} />
      ) : tableroActivo?.modo === "constelacion" ? (
        <VistaConstelacion {...vistaProps} />
      ) : (
        <StickerCanvas {...vistaProps} />
      )}

      {tableroActivo?.dedicatoria &&
        !(tableroActivo.fecha_revelacion && new Date(tableroActivo.fecha_revelacion) > new Date()) && (
          <DedicatoriaReveal
            tableroId={tableroActivo.id}
            dedicatoria={tableroActivo.dedicatoria}
          />
        )}
    </main>
  );
}
