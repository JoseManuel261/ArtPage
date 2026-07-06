# 🎨 Lienzo Colage — Glitch Art

Lienzo de arte digital interactivo estilo *sticker bomb / collage urbano*,
inspirado libremente en la estética del glitch art, el fanzine punk y los
neones psicodélicos (no está afiliado a ninguna marca ni franquicia).
Permite crear varios tableros permanentes, subir imágenes, arrastrarlas
libremente por el lienzo, y **el propio lienzo adapta su paleta de color
al contenido que subes** — analizado 100% en el navegador, gratis.

---

## 🌈 La pieza central: paleta ambiental adaptativa

Cada vez que subes una imagen, la app la lee en un `<canvas>` oculto del
navegador y calcula su **color dominante** (sin ninguna IA de pago, sin
llamadas a servicios externos — es matemática de color pura, corriendo
en el cliente). Con los colores de todos los stickers de un tablero,
calcula un **"estado de ánimo"** para ese lienzo:

- El fondo del lienzo se destiñe suavemente hacia esa paleta (gradientes
  radiales de baja opacidad, con transición de ~2 segundos).
- Cada sticker tiene un brillo (glow) alrededor tintado con **su propio**
  color dominante, así que el collage entero cobra cohesión visual.
- El botón de carga y los acentos de la interfaz también adoptan el
  color principal detectado.
- Un indicador en la esquina del lienzo muestra la etiqueta textual del
  tono detectado (ej. *"fucsia pop"*, *"cian eléctrico"*, *"verde
  tóxico"*), y la barra lateral muestra una franja con las muestras de
  color (`paleta_detectada`).

Así que si subes muchas fotos rosadas, el lienzo entero se va tiñendo de
rosa; si subes fotos frías y azules, se va hacia el cian/violeta. Todo
por tablero, y se recalcula en vivo con cada imagen nueva.

**Por qué es gratis:** no se usa ninguna API de visión por computadora
ni modelo de IA de pago. El análisis de color (promedio ponderado por
saturación y luminosidad, con media circular de matiz en espacio HSL)
corre enteramente en JavaScript, en el navegador de quien usa la app —
cero costo, cero límite de uso, cero llamadas de red adicionales.

Todo el motor vive en [`lib/colorAnalysis.ts`](./lib/colorAnalysis.ts).

---

## 💡 Más ideas artísticas para complementar (no implementadas aún)

Estas son extensiones naturales de la misma idea, pensadas para seguir
sumando sin salir del presupuesto "100% gratis, cliente-side":

1. **Exportar el lienzo como póster (PNG)** — capturar el DOM del
   canvas con una librería como `html2canvas` y descargar la
   composición final como imagen, para imprimir o compartir.
2. **Partículas ambientales** — un fondo de partículas sutiles (puntos,
   ruido) tintadas con la paleta detectada, flotando lentamente detrás
   de los stickers.
3. **Auto-arreglo tipo colmena** — un botón "ordenar" que reacomoda los
   stickers en una cuadrícula/espiral con animación, sin perder el
   desorden orgánico del collage al soltar.
4. **Modo "polaroid"** — variante de borde para cada sticker que imita
   el marco blanco grueso de una polaroid, con fecha/etiqueta generada.
5. **Detección de contraste automático** — si la paleta detectada es
   muy clara (fondos blancos, pastel), invertir automáticamente el
   color del texto/UI para que siga siendo legible.
6. **Historial de paletas del tablero** — guardar un pequeño timeline
   de cómo fue cambiando el "estado de ánimo" del lienzo a medida que
   se agregaban stickers, como una linea de tiempo de humor visual.

Si quieres que desarrolle cualquiera de estas, dímelo y seguimos.

---

## 1. Estructura del proyecto

```
lienzo-colage-glitch/
├── app/
│   ├── layout.tsx        # Layout raíz, fuentes y metadata
│   ├── page.tsx          # Ensambla sidebar + canvas, efectos CRT, drawer móvil
│   └── globals.css       # Tailwind + scanlines/CRT globales
├── components/
│   ├── SVGFilters.tsx       # Filtro SVG duotono (fucsia/cian)
│   ├── SidebarTableros.tsx  # Panel lateral: listar/crear tableros + paleta
│   └── StickerCanvas.tsx    # Lienzo: subir, arrastrar, guardar stickers, tema adaptativo
├── lib/
│   ├── supabaseClient.ts # Cliente único de Supabase
│   ├── types.ts          # Interfaces TypeScript: Tablero, Sticker
│   └── colorAnalysis.ts  # Motor de analisis de color 100% client-side
├── sql/
│   └── schema.sql        # Script SQL para Supabase (tablas + policies + storage)
├── .env.local.example
├── .gitignore
├── next.config.js
├── package.json
├── postcss.config.js
├── tailwind.config.ts
└── tsconfig.json
```

> Todo vive en la raíz del proyecto (sin carpeta `src/`), con nombres de
> archivo consistentes en mayúsculas/minúsculas para evitar el clásico
> error de Vercel con sistemas de archivos *case-sensitive* en Linux.

---

## 2. Configurar Supabase

1. Crea un proyecto gratuito en [supabase.com](https://supabase.com).
2. Ve a **SQL Editor > New query**, pega el contenido completo de
   [`sql/schema.sql`](./sql/schema.sql) y ejecútalo. Esto crea:
   - Tabla `tableros` (id, nombre, created_at)
   - Tabla `stickers` (id, tablero_id, image_url, x, y, rotation, scale,
     filter_type, z_index, dominant_color, created_at)
   - Políticas RLS de lectura/escritura pública (capa gratuita, sin login)
   - Políticas de Storage para el bucket de imágenes (ver siguiente paso)
3. ⚠️ **Paso manual obligatorio** — ve a **Storage > Create a new bucket**:
   - Nombre exacto: `imagenes_stickers`
   - Marca **Public bucket = ON**
   - El script SQL ya agrega las políticas de `insert`/`select` sobre
     `storage.objects` — sin eso, "Public bucket" solo permite *leer*
     imágenes, no subirlas.
4. Copia tus credenciales desde **Project Settings > API Keys**:

   > ⚠️ **Cambio reciente de Supabase:** las claves clásicas `anon` /
   > `service_role` (JWT) están en proceso de retiro (se deprecan a
   > fines de 2026), y los proyectos creados desde noviembre de 2025 ya
   > no las incluyen por defecto. Ahora se usan:
   > - **Publishable key** (`sb_publishable_...`) → segura para el
   >   navegador, es la que usa esta app.
   > - **Secret key** (`sb_secret_...`) → solo backend, esta app no la
   >   necesita.
   >
   > Copia el **Project URL** (pestaña "API Keys" o botón "Connect") y
   > la **Publishable key**.

---

## 3. Instalación local

```bash
# 1. Crear el proyecto Next.js limpio (App Router, TS, Tailwind, sin src/)
npx create-next-app@latest lienzo-colage-glitch --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*"
cd lienzo-colage-glitch

# 2. Instalar dependencias del proyecto
npm install framer-motion @supabase/supabase-js lucide-react

# 3. Copiar aquí los archivos de este entregable (app/, components/, lib/, sql/)
#    reemplazando los archivos por defecto que genera create-next-app.

# 4. Configurar variables de entorno
cp .env.local.example .env.local
# edita .env.local con tu Project URL y tu Publishable key de Supabase

# 5. Levantar en desarrollo
npm run dev
```

---

## 4. Flujo de Git e inicialización para Vercel

```bash
git init
git add .
git commit -m "feat: lienzo colage con paleta adaptativa"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/lienzo-colage-glitch.git
git push -u origin main
```

Luego, en [vercel.com](https://vercel.com):
1. **Add New Project** → importa el repo recién subido.
2. En **Environment Variables**, agrega `NEXT_PUBLIC_SUPABASE_URL` y
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` con los mismos valores de tu
   `.env.local`.
3. Deploy.

---

## 5. Estética y filtros

- **Raw**: imagen original, sin procesar.
- **Hackeado**: clases de Tailwind agresivas —
  `contrast-[250%] saturate-[200%] hue-rotate-[180deg] invert`.
- **Duotono**: usa el filtro SVG global `#glitch-duotone` (inyectado
  por `SVGFilters.tsx`), remapeando cualquier imagen a un degradado de
  dos tonos entre fucsia neón y cian eléctrico.
- **Paleta ambiental**: ver la sección de arriba — es lo que hace que
  cada tablero se sienta único según lo que subas.

Todo el procesamiento ocurre 100% en el navegador del usuario: es
inmediato, gratuito e ilimitado, sin llamadas a APIs de imagen de pago.

---

## 6. Notas sobre persistencia

- Cada tablero es independiente: al seleccionar uno en la barra
  lateral, el canvas solo carga y guarda los stickers de ese
  `tablero_id`, incluyendo su color dominante guardado.
- Al soltar un sticker, sus coordenadas `x`/`y` se actualizan de
  inmediato en Supabase.
- Si un tablero se crea vacío, se siembran automáticamente 3 stickers
  decorativos de bienvenida.
- El color dominante de cada imagen se calcula una sola vez, al
  subirla, y se guarda en la base de datos — así el "estado de ánimo"
  del lienzo es instantáneo en cada carga, sin tener que re-analizar
  las imágenes cada vez.
