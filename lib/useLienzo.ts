"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase, STICKERS_BUCKET } from "./supabaseClient";
import type { FilterType, Sticker, Tablero } from "./types";
import {
  calcularEstadoAnimo,
  extraerPaletaDeArchivo,
  seleccionarColoresDestacados,
} from "./colorAnalysis";
import { generarImagenIA } from "./iaGenerador";
import { sonidos } from "./sonido";

function randomRotacionInicial() {
  return Math.random() * 30 - 15;
}

function rutaDesdeUrlPublica(url: string): string | null {
  const marcador = `/object/public/${STICKERS_BUCKET}/`;
  const idx = url.indexOf(marcador);
  if (idx === -1) return null;
  return decodeURIComponent(url.slice(idx + marcador.length));
}

const SIGUIENTE_FILTRO: Record<FilterType, FilterType> = {
  raw: "hackeado",
  hackeado: "duotone",
  duotone: "raw",
};

/**
 * Hook central que maneja TODA la logica de datos de un tablero:
 * cargar, subir, generar con IA, crear cartelitos, eliminar, cambiar
 * filtro/escala/posicion, y calcular la paleta/estado de animo.
 *
 * Se reutiliza en los 4 "modos" de interfaz (Collage, Album, Timeline,
 * Presentacion) para que cada uno solo se preocupe de COMO se ve y se
 * navega, no de la logica de Supabase — evita duplicar el mismo codigo
 * 4 veces.
 */
export function useLienzo(tablero: Tablero | null) {
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [cargando, setCargando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const maxZRef = useRef(1);
  const guardadoScaleRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    if (!tablero) {
      setStickers([]);
      return;
    }
    let cancelado = false;

    async function cargar() {
      setCargando(true);
      const { data, error } = await supabase
        .from("stickers")
        .select("*")
        .eq("tablero_id", tablero!.id)
        .order("z_index", { ascending: true });

      if (!cancelado) {
        if (error) {
          console.error("Error cargando stickers:", error.message);
        } else if (data) {
          setStickers(data as Sticker[]);
          maxZRef.current = data.reduce((m, s) => Math.max(m, s.z_index), 1);
        }
        setCargando(false);
      }
    }
    cargar();
    return () => {
      cancelado = true;
    };
  }, [tablero?.id]);

  const subirArchivoComoSticker = useCallback(
    async (file: File) => {
      if (!tablero) return;
      setSubiendo(true);
      try {
        const paleta = await extraerPaletaDeArchivo(file, 5);
        const colorDominante = paleta[0] || "#ff2e88";
        const extension = file.name.split(".").pop() || "png";
        const ruta = `${tablero.id}/${crypto.randomUUID()}.${extension}`;

        const { error: errSubida } = await supabase.storage
          .from(STICKERS_BUCKET)
          .upload(ruta, file, { cacheControl: "3600", upsert: false });
        if (errSubida) throw errSubida;

        const { data: urlPublica } = supabase.storage
          .from(STICKERS_BUCKET)
          .getPublicUrl(ruta);

        const nuevoZ = maxZRef.current + 1;
        maxZRef.current = nuevoZ;

        const nuevo = {
          tablero_id: tablero.id,
          tipo: "imagen" as const,
          image_url: urlPublica.publicUrl,
          x: 100 + Math.random() * 120,
          y: 100 + Math.random() * 120,
          rotation: randomRotacionInicial(),
          scale: 1,
          filter_type: "raw" as FilterType,
          z_index: nuevoZ,
          dominant_color: colorDominante,
          palette: paleta,
          texto: null,
          color_fondo: null,
          fuente: null,
        };

        const { data, error } = await supabase
          .from("stickers")
          .insert(nuevo)
          .select()
          .single();
        if (error) throw error;
        if (data) {
          setStickers((prev) => [...prev, data as Sticker]);
          sonidos.subir();
        }
      } catch (err) {
        console.error("Error subiendo sticker:", err);
      } finally {
        setSubiendo(false);
      }
    },
    [tablero]
  );

  const crearCartelitoTexto = useCallback(
    async (texto: string, fuente: string, colorFondo: string) => {
      if (!tablero || !texto.trim()) return;
      const nuevoZ = maxZRef.current + 1;
      maxZRef.current = nuevoZ;

      const nuevo = {
        tablero_id: tablero.id,
        tipo: "texto" as const,
        image_url: "",
        x: 100 + Math.random() * 120,
        y: 100 + Math.random() * 120,
        rotation: randomRotacionInicial(),
        scale: 1,
        filter_type: "raw" as FilterType,
        z_index: nuevoZ,
        dominant_color: colorFondo,
        palette: [colorFondo],
        texto: texto.trim(),
        color_fondo: colorFondo,
        fuente,
      };

      const { data, error } = await supabase
        .from("stickers")
        .insert(nuevo)
        .select()
        .single();
      if (error) {
        console.error("Error creando cartelito:", error.message);
        return;
      }
      if (data) {
        setStickers((prev) => [...prev, data as Sticker]);
        sonidos.subir();
      }
    },
    [tablero]
  );

  const generarConIA = useCallback(
    async (prompt: string) => {
      const archivo = await generarImagenIA(prompt);
      await subirArchivoComoSticker(archivo);
    },
    [subirArchivoComoSticker]
  );

  const eliminarSticker = useCallback(async (sticker: Sticker) => {
    setStickers((prev) => prev.filter((s) => s.id !== sticker.id));
    sonidos.eliminar();

    const { error } = await supabase.from("stickers").delete().eq("id", sticker.id);
    if (error) {
      console.error("Error eliminando sticker:", error.message);
      return;
    }
    if (sticker.tipo === "imagen" && !sticker.image_url.startsWith("data:")) {
      const ruta = rutaDesdeUrlPublica(sticker.image_url);
      if (ruta) await supabase.storage.from(STICKERS_BUCKET).remove([ruta]);
    }
  }, []);

  const traerAlFrente = useCallback((id: string) => {
    const nuevoZ = maxZRef.current + 1;
    maxZRef.current = nuevoZ;
    setStickers((prev) => prev.map((s) => (s.id === id ? { ...s, z_index: nuevoZ } : s)));
  }, []);

  const actualizarPosicion = useCallback(async (sticker: Sticker, x: number, y: number) => {
    setStickers((prev) => prev.map((s) => (s.id === sticker.id ? { ...s, x, y } : s)));
    const { error } = await supabase
      .from("stickers")
      .update({ x, y, z_index: sticker.z_index })
      .eq("id", sticker.id);
    if (error) console.error("Error guardando posicion:", error.message);
  }, []);

  const cambiarFiltro = useCallback((sticker: Sticker) => {
    const nuevoFiltro = SIGUIENTE_FILTRO[sticker.filter_type];
    sonidos.filtro();
    setStickers((prev) =>
      prev.map((s) => (s.id === sticker.id ? { ...s, filter_type: nuevoFiltro } : s))
    );
    supabase
      .from("stickers")
      .update({ filter_type: nuevoFiltro })
      .eq("id", sticker.id)
      .then(({ error }) => {
        if (error) console.error("Error guardando filtro:", error.message);
      });
  }, []);

  const actualizarEscala = useCallback((sticker: Sticker, escala: number) => {
    setStickers((prev) => prev.map((s) => (s.id === sticker.id ? { ...s, scale: escala } : s)));
    clearTimeout(guardadoScaleRef.current[sticker.id]);
    guardadoScaleRef.current[sticker.id] = setTimeout(async () => {
      const { error } = await supabase
        .from("stickers")
        .update({ scale: escala })
        .eq("id", sticker.id);
      if (error) console.error("Error guardando escala:", error.message);
    }, 500);
  }, []);

  const todosLosColores = useMemo(
    () => stickers.flatMap((s) => s.palette || (s.dominant_color ? [s.dominant_color] : [])),
    [stickers]
  );
  const estadoAnimo = useMemo(() => calcularEstadoAnimo(todosLosColores), [todosLosColores]);
  const coloresAurora = useMemo(
    () => seleccionarColoresDestacados(todosLosColores, 5),
    [todosLosColores]
  );

  return {
    stickers,
    cargando,
    subiendo,
    subirArchivoComoSticker,
    crearCartelitoTexto,
    generarConIA,
    eliminarSticker,
    traerAlFrente,
    actualizarPosicion,
    cambiarFiltro,
    actualizarEscala,
    todosLosColores,
    estadoAnimo,
    coloresAurora,
  };
}
