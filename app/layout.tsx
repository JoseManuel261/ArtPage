import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "STICKER BOMB // DEDSEC EDITION",
  description:
    "Lienzo interactivo de arte digital inspirado en el hacktivismo, el glitch art y la contracultura de Watch Dogs 2.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-dedsec-black text-dedsec-paper antialiased">
        {children}
      </body>
    </html>
  );
}
