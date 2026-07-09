"use client";

import type { Sticker } from "@/lib/types";
import { useTema } from "@/lib/TemaContext";

interface ModalEliminarProps {
  sticker: Sticker | null;
  onConfirmar: (sticker: Sticker) => void;
  onCancelar: () => void;
}

export default function ModalEliminar({ sticker, onConfirmar, onCancelar }: ModalEliminarProps) {
  const tema = useTema();
  if (!sticker) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div
        className="w-full max-w-xs p-4"
        style={{ backgroundColor: tema.superficie, borderRadius: tema.bordeRadio, boxShadow: tema.sombra, color: tema.texto, fontFamily: tema.fuenteUI }}
      >
        {sticker.tipo === "imagen" ? (
          <img
            src={sticker.image_url}
            alt=""
            className="mx-auto mb-3 h-20 w-20 object-cover"
            style={{ border: `2px solid ${tema.efectosRetro ? "#000" : tema.textoSuave}`, borderRadius: tema.bordeRadio / 2 }}
          />
        ) : (
          <div
            className="mx-auto mb-3 flex h-20 w-28 items-center justify-center p-2 text-center text-xs"
            style={{
              backgroundColor: sticker.color_fondo || "#fff4d6",
              fontFamily: sticker.fuente || undefined,
              borderRadius: tema.bordeRadio / 2,
            }}
          >
            {sticker.texto}
          </div>
        )}
        <p className="mb-3 text-center text-xs">
          ¿Eliminar esto del lienzo? Esta acción no se puede deshacer.
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => onConfirmar(sticker)}
            className="flex-1 px-3 py-1.5 text-xs font-bold"
            style={{ backgroundColor: tema.acento, color: tema.fondo, borderRadius: tema.bordeRadio / 2 }}
          >
            Sí, borrar
          </button>
          <button
            onClick={onCancelar}
            className="flex-1 px-3 py-1.5 text-xs"
            style={{ border: `1px solid ${tema.textoSuave}66`, color: tema.textoSuave, borderRadius: tema.bordeRadio / 2 }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
