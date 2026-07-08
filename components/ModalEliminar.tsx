"use client";

import type { Sticker } from "@/lib/types";

interface ModalEliminarProps {
  sticker: Sticker | null;
  onConfirmar: (sticker: Sticker) => void;
  onCancelar: () => void;
}

export default function ModalEliminar({ sticker, onConfirmar, onCancelar }: ModalEliminarProps) {
  if (!sticker) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-xs border-4 border-black bg-neutral-900 p-4 font-mono shadow-[6px_6px_0px_#000]">
        {sticker.tipo === "imagen" ? (
          <img
            src={sticker.image_url}
            alt=""
            className="mx-auto mb-3 h-20 w-20 border-4 border-white object-cover"
          />
        ) : (
          <div
            className="mx-auto mb-3 flex h-20 w-28 items-center justify-center border-4 border-white p-2 text-center text-xs"
            style={{
              backgroundColor: sticker.color_fondo || "#fff4d6",
              fontFamily: sticker.fuente || undefined,
            }}
          >
            {sticker.texto}
          </div>
        )}
        <p className="mb-3 text-center text-xs text-punk-paper">
          ¿Eliminar esto del lienzo? Esta accion no se puede deshacer.
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => onConfirmar(sticker)}
            className="flex-1 border-2 border-black bg-punk-pink px-3 py-1.5 text-xs font-bold text-black"
          >
            SI, BORRAR
          </button>
          <button
            onClick={onCancelar}
            className="flex-1 border-2 border-punk-paper/40 px-3 py-1.5 text-xs text-punk-paper/70"
          >
            cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
