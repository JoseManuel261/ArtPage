import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lienzo Colage",
  description:
    "Lienzo interactivo de recuerdos: sube fotos, escribe cartelitos, genera imagenes con IA, y elige entre varios modos y temas visuales — collage, album, linea de tiempo, presentacion y constelacion.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#111827",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      {/* El color real de fondo lo pone cada pagina segun el tema activo;
          este es solo un neutro de espera para evitar un flash antes de
          que React hidrate. */}
      <body className="bg-[#fafaf9] text-[#1c1917] antialiased">
        {children}
      </body>
    </html>
  );
}
