"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Loader2 } from "lucide-react";

function FormularioAcceso() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [clave, setClave] = useState("");
  const [verificando, setVerificando] = useState(false);
  const [error, setError] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setVerificando(true);
    setError(false);

    try {
      const res = await fetch("/api/verificar-acceso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clave }),
      });
      const data = await res.json();

      if (data.ok) {
        const destino = searchParams.get("next") || "/";
        router.replace(destino);
        router.refresh();
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setVerificando(false);
    }
  }

  return (
    <main className="flex h-screen w-screen items-center justify-center bg-[#fafaf9] px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-xs rounded-2xl border border-black/10 bg-white p-6 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.18)]"
      >
        <div className="mb-5 flex flex-col items-center gap-2 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-900">
            <Lock className="h-6 w-6 text-white" />
          </div>
          <p className="text-sm font-semibold text-gray-900">Acceso privado</p>
          <p className="text-[13px] text-gray-500">
            Este lienzo es privado. Ingresa la clave para entrar.
          </p>
        </div>

        <input
          autoFocus
          type="password"
          value={clave}
          onChange={(e) => setClave(e.target.value)}
          placeholder="Clave de acceso"
          className="mb-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-900"
        />

        {error && (
          <p className="mb-3 text-center text-[12px] text-red-500">
            Clave incorrecta, intenta de nuevo.
          </p>
        )}

        <button
          type="submit"
          disabled={verificando || !clave}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-40"
        >
          {verificando ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar"}
        </button>
      </form>
    </main>
  );
}

export default function PaginaAcceso() {
  return (
    <Suspense
      fallback={
        <main className="flex h-screen w-screen items-center justify-center bg-[#fafaf9]">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </main>
      }
    >
      <FormularioAcceso />
    </Suspense>
  );
}
