"use client";

/**
 * Inyecta filtros SVG globales reutilizables en toda la app.
 * El filtro "glitch-duotone" remapea cualquier imagen a una gama
 * de dos tonos: fucsia neon (#ff007f) en las sombras y cian
 * electrico (#00f3ff) en las luces, sobre una base negra profunda.
 *
 * Se referencia desde CSS/Tailwind con: style={{ filter: "url(#glitch-duotone)" }}
 */
export default function SVGFilters() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
    >
      <defs>
        <filter id="glitch-duotone" colorInterpolationFilters="sRGB">
          {/* 1. Convertimos la imagen a escala de grises primero */}
          <feColorMatrix
            type="matrix"
            values="0.33 0.33 0.33 0 0
                    0.33 0.33 0.33 0 0
                    0.33 0.33 0.33 0 0
                    0    0    0    1 0"
            result="gris"
          />
          {/* 2. Remapeamos el gris a un degradado duotono fucsia -> cian */}
          <feComponentTransfer in="gris" result="duotono">
            <feFuncR type="table" tableValues="0.02 1.0" />
            <feFuncG type="table" tableValues="0.0 0.95" />
            <feFuncB type="table" tableValues="0.13 1.0" />
            <feFuncA type="table" tableValues="1 1" />
          </feComponentTransfer>
          {/* 3. Empujamos contraste y saturacion para el look "hackeado" */}
          <feComponentTransfer in="duotono">
            <feFuncR type="gamma" amplitude="1" exponent="0.85" offset="0" />
            <feFuncG type="gamma" amplitude="1" exponent="0.85" offset="0" />
            <feFuncB type="gamma" amplitude="1" exponent="0.85" offset="0" />
          </feComponentTransfer>
        </filter>

        {/* Filtro extra: distorsion tipo glitch para hover/estados de error */}
        <filter id="glitch-noise">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.02 0.9"
            numOctaves="2"
            seed="7"
            result="ruido"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="ruido"
            scale="8"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  );
}
