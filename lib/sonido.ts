"use client";

/**
 * Efectos de sonido generados en vivo con la Web Audio API — sin
 * archivos de audio, sin librerias, sin llamadas de red. Son
 * pequeños "blips" tipo 8-bit que encajan con la estetica glitch.
 */

let ctxAudio: AudioContext | null = null;

function obtenerContexto(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctxAudio) {
    const AudioCtx =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return null;
    ctxAudio = new AudioCtx();
  }
  return ctxAudio;
}

function reproducirTono(
  frecInicial: number,
  frecFinal: number,
  duracion: number,
  tipo: OscillatorType = "square",
  volumen = 0.05
) {
  const ctx = obtenerContexto();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume();

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = tipo;
  osc.frequency.setValueAtTime(frecInicial, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(
    Math.max(frecFinal, 1),
    ctx.currentTime + duracion
  );
  gain.gain.setValueAtTime(volumen, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duracion);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duracion);
}

export const sonidoActivo = {
  get(): boolean {
    if (typeof window === "undefined") return true;
    const v = window.localStorage.getItem("lienzo_sonido");
    return v === null ? true : v === "1";
  },
  set(activo: boolean) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("lienzo_sonido", activo ? "1" : "0");
  },
};

function siEstaActivo(fn: () => void) {
  if (sonidoActivo.get()) fn();
}

export const sonidos = {
  subir: () => siEstaActivo(() => reproducirTono(220, 880, 0.18, "square", 0.04)),
  eliminar: () => siEstaActivo(() => reproducirTono(500, 80, 0.22, "sawtooth", 0.05)),
  filtro: () => siEstaActivo(() => reproducirTono(660, 440, 0.1, "triangle", 0.035)),
  click: () => siEstaActivo(() => reproducirTono(340, 420, 0.06, "square", 0.03)),
};
