import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lienzo Colage // Glitch Art",
  description:
    "Lienzo interactivo de arte digital inspirado en el glitch art, el fanzine punk y el collage urbano, con paleta ambiental que se adapta al color de tus imagenes.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-punk-black text-punk-paper antialiased">
        {children}
      </body>
    </html>
  );
}
