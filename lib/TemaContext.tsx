"use client";

import { createContext, useContext } from "react";
import { obtenerTema, type DefinicionTema } from "./temas";
import type { TemaVisual } from "./types";

const TemaContext = createContext<DefinicionTema>(obtenerTema("minimal"));

interface TemaProviderProps {
  tema: TemaVisual | null | undefined;
  children: React.ReactNode;
}

/**
 * Provee el tema visual activo (colores, tipografia, bordes, sombras)
 * a toda la interfaz sin tener que pasarlo a mano por cada componente.
 * Cambia segun el tablero seleccionado.
 */
export function TemaProvider({ tema, children }: TemaProviderProps) {
  const definicion = obtenerTema(tema);
  return <TemaContext.Provider value={definicion}>{children}</TemaContext.Provider>;
}

export function useTema(): DefinicionTema {
  return useContext(TemaContext);
}
