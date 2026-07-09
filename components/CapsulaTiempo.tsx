"use client";

import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { useTema } from "@/lib/TemaContext";

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
 * Se adapta al tema visual del tablero.
 */
export default function CapsulaTiempo({ fechaRevelacion, nombreTablero }: CapsulaTiempoProps) {
  const tema = useTema();
  const [restante, setRestante] = useState(() => calcularRestante(fechaRevelacion));

  useEffect(() => {
    const intervalo = setInterval(() => setRestante(calcularRestante(fechaRevelacion)), 1000);
    return () => clearInterval(intervalo);
  }, [fechaRevelacion]);

  if (!restante) return null;

  const fechaLegible = new Date(fechaRevelacion).toLocaleDateString("es", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div
      className="flex h-full flex-1 flex-col items-center justify-center gap-6 px-6 text-center"
      style={{ backgroundColor: tema.fondo, color: tema.texto, fontFamily: tema.fuenteUI }}
    >
      <div
        className="flex h-20 w-20 items-center justify-center"
        style={{ border: `${tema.bordeGrosor}px solid ${tema.acento}`, borderRadius: tema.bordeRadio, boxShadow: tema.sombra }}
      >
        <Lock className="h-9 w-9" style={{ color: tema.acento }} />
      </div>
      <div>
        <p className="text-xs uppercase tracking-[0.25em]" style={{ color: tema.acentoSecundario }}>
          Cápsula del tiempo
        </p>
        <p className="mt-2 text-lg">
          "{nombreTablero}" se abre el {fechaLegible}
        </p>
      </div>

      <div className="flex gap-3">
        {[
          { valor: restante.dias, etiqueta: "días" },
          { valor: restante.horas, etiqueta: "hrs" },
          { valor: restante.min, etiqueta: "min" },
          { valor: restante.seg, etiqueta: "seg" },
        ].map((u) => (
          <div
            key={u.etiqueta}
            className="flex w-16 flex-col items-center py-3"
            style={{ backgroundColor: tema.superficie, borderRadius: tema.bordeRadio / 2, boxShadow: tema.sombraChica }}
          >
            <span className="text-2xl font-bold" style={{ color: tema.acento }}>
              {String(u.valor).padStart(2, "0")}
            </span>
            <span className="text-[9px] uppercase tracking-wider" style={{ color: tema.textoSuave }}>
              {u.etiqueta}
            </span>
          </div>
        ))}
      </div>

      <p className="max-w-xs text-[11px]" style={{ color: tema.textoSuave }}>
        Vuelve en esa fecha para descubrir lo que hay adentro.
      </p>
    </div>
  );
}
