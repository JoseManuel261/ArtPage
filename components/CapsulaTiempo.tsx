"use client";

import { useEffect, useState } from "react";
import { Lock } from "lucide-react";

interface CapsulaTiempoProps {
  fechaRevelacion: string;
  nombreTablero: string;
}

function calcularRestante(fecha: string) {
  const diff = new Date(fecha).getTime() - Date.now();
  if (diff <= 0) return null;
  const dias = Math.floor(diff / (1000 * 60 * 60 * 24));
  const horas = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const min = Math.floor((diff / (1000 * 60)) % 60);
  const seg = Math.floor((diff / 1000) % 60);
  return { dias, horas, min, seg };
}

/**
 * Pantalla de bloqueo tipo "capsula del tiempo": se muestra en vez del
 * contenido del tablero mientras la fecha de revelacion no haya
 * llegado. Cuenta regresiva en vivo, sin ningun costo ni API externa.
 */
export default function CapsulaTiempo({ fechaRevelacion, nombreTablero }: CapsulaTiempoProps) {
  const [restante, setRestante] = useState(() => calcularRestante(fechaRevelacion));

  useEffect(() => {
    const intervalo = setInterval(() => {
      setRestante(calcularRestante(fechaRevelacion));
    }, 1000);
    return () => clearInterval(intervalo);
  }, [fechaRevelacion]);

  if (!restante) return null; // ya se cumplio la fecha, el padre debe re-render sin la capsula

  const fechaLegible = new Date(fechaRevelacion).toLocaleDateString("es", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex h-full flex-1 flex-col items-center justify-center gap-6 bg-punk-black px-6 text-center font-mono text-punk-paper">
      <div className="flex h-20 w-20 items-center justify-center border-4 border-punk-pink shadow-[6px_6px_0px_#000]">
        <Lock className="h-9 w-9 text-punk-pink" />
      </div>
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-punk-cyan">
          capsula del tiempo
        </p>
        <p className="mt-2 text-lg text-punk-paper">
          "{nombreTablero}" se abre el {fechaLegible}
        </p>
      </div>

      <div className="flex gap-3">
        {[
          { valor: restante.dias, etiqueta: "dias" },
          { valor: restante.horas, etiqueta: "hrs" },
          { valor: restante.min, etiqueta: "min" },
          { valor: restante.seg, etiqueta: "seg" },
        ].map((u) => (
          <div
            key={u.etiqueta}
            className="flex w-16 flex-col items-center border-4 border-black bg-neutral-900 py-3 shadow-[4px_4px_0px_#000]"
          >
            <span className="text-2xl font-bold text-punk-pink">
              {String(u.valor).padStart(2, "0")}
            </span>
            <span className="text-[9px] uppercase tracking-wider text-punk-paper/50">
              {u.etiqueta}
            </span>
          </div>
        ))}
      </div>

      <p className="max-w-xs text-[11px] text-punk-paper/40">
        vuelve en esa fecha para descubrir lo que hay adentro_
      </p>
    </div>
  );
}
