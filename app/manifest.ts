import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Lienzo Colage",
    short_name: "Lienzo",
    description: "Un lienzo de recuerdos: fotos, cartelitos e imagenes generadas con IA.",
    start_url: "/",
    display: "standalone",
    background_color: "#fafaf9",
    theme_color: "#111827",
    icons: [
      { src: "/icon.png", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
