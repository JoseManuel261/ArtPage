"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, X } from "lucide-react";
import { useTema } from "@/lib/TemaContext";

interface DedicatoriaRevealProps {
  tableroId: string;
  dedicatoria: string;
}

/**
 * Muestra el mensaje de dedicatoria de un tablero como una tarjeta
 * superpuesta, una vez por sesion. Se adapta al tema visual activo.
 */
export default function DedicatoriaReveal({ tableroId, dedicatoria }: DedicatoriaRevealProps) {
  const tema = useTema();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!dedicatoria) return;
    const clave = `dedicatoria_vista_${tableroId}`;
    const yaVista = typeof window !== "undefined" && sessionStorage.getItem(clave);
    if (!yaVista) setVisible(true);
  }, [tableroId, dedicatoria]);

  function cerrar() {
    setVisible(false);
    sessionStorage.setItem(`dedicatoria_vista_${tableroId}`, "1");
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4"
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 20 }}
            className="relative w-full max-w-sm p-6 text-center"
            style={{ backgroundColor: tema.superficie, borderRadius: tema.bordeRadio, boxShadow: tema.sombra, fontFamily: tema.fuenteUI }}
          >
            <button
              onClick={cerrar}
              className="absolute right-2 top-2"
              style={{ color: tema.textoSuave }}
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
            <Heart className="mx-auto mb-3 h-7 w-7" style={{ color: tema.acento }} fill="currentColor" />
            <p className="whitespace-pre-wrap text-sm leading-relaxed" style={{ color: tema.texto }}>
              {dedicatoria}
            </p>
            <button
              onClick={cerrar}
              className="mt-5 px-4 py-1.5 text-[11px]"
              style={{ border: `1px solid ${tema.acento}`, color: tema.acento, borderRadius: tema.bordeRadio / 2 }}
            >
              Continuar
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
