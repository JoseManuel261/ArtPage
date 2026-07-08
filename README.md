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
navegador (el **archivo local, antes de subirlo** — así se evita
cualquier problema de CORS) y le extrae una **paleta de 5 colores
representativos**, usando un mini algoritmo de agrupamiento de color
(k-means simplificado) que corre en JavaScript puro. Nada de esto pasa
por una IA de pago ni un servicio externo: es matemática de color
corriendo en el navegador de quien usa la app.

Con la paleta acumulada de todos los stickers de un tablero, el lienzo
construye dos capas de ambiente:

1. **"Ecos" de las fotos mismas** — hasta 5 de las imágenes más
   recientes se renderizan de fondo, muy difuminadas (`blur` fuerte,
   opacidad baja, mezcla de color tipo "screen"), flotando despacio.
   El fondo literalmente muestra formas y colores de tus propias fotos,
   no solo un tinte plano.
2. **Fondo tipo aurora** — 4 o 5 manchas de color grandes y difuminadas,
   tomadas de los tonos más vivos y variados de la paleta detectada
   (agrupados por matiz, no solo un promedio), flotando lentamente en
   distintas posiciones del lienzo.

Además:
- Cada sticker individual tiene un brillo (glow) alrededor tintado con
  **su propio** color dominante.
- El botón de carga y los acentos de la interfaz adoptan el color
  principal detectado.
- Un indicador en la esquina del lienzo muestra la etiqueta textual del
  tono detectado (ej. *"fucsia pop"*, *"cian eléctrico"*), y la barra
  lateral muestra una franja con las muestras de color
  (`paleta_detectada`).

Así que si subes muchas fotos rosadas, el lienzo entero se va llenando
de manchas rosas y hasta las siluetas difuminadas de esas fotos quedan
flotando de fondo. Con fotos frías y azules, se va hacia el cian/violeta.

**Por qué es gratis:** no se usa ninguna API de visión por computadora
ni modelo de IA de pago. Todo el análisis (clustering de color en RGB,
selección de tonos vivos por matiz, promedios circulares en HSL) corre
enteramente en JavaScript, en el navegador — cero costo, cero límite de
uso, cero llamadas de red adicionales.

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

---

## ✨ Generar imágenes con IA (gratis, sin cuenta)

Además de subir tus propias fotos, hay un botón **GENERAR_IA.exe** que
te deja escribir una descripción (ej. *"corazón de neón fucsia estilo
glitch"*) y crea una imagen con IA para agregar directo al lienzo.
Usa [Pollinations.ai](https://pollinations.ai), un servicio gratuito
y sin necesidad de cuenta ni llave de API. La imagen generada se
descarga y se vuelve a subir a tu propio Storage de Supabase, asi que
queda guardada de forma permanente sin depender de que el servicio
externo siga disponible para siempre.

## 📝 Cartelitos de texto

El botón **AÑADIR_TEXTO.exe** te deja escribir un mensaje corto (hasta
140 caracteres), elegir una de 5 tipografías expresivas (marcador,
manuscrita, cómic, terminal, impacto) y un color de fondo — y se agrega
al lienzo como un cartelito más, con el mismo comportamiento que las
fotos: se puede arrastrar, rotar, redimensionar con la rueda del mouse,
y eliminar.

## 🛠️ Otras mejoras de esta version

- **Redimensionar stickers**: pasa el mouse sobre cualquier sticker y
  usa la rueda para agrandarlo o achicarlo.
- **Cambiar filtro por sticker**: cada foto tiene un boton para ciclar
  entre RAW / HACK (invertido y saturado) / DUO (duotono neon).
- **Exportar el lienzo como PNG**: boton "guardar.png" arriba a la
  derecha, compone todos los stickers (fotos y cartelitos) en una sola
  imagen para imprimir o compartir.
- **Sonido**: pequeños efectos tipo 8-bit generados en vivo (Web Audio
  API, sin archivos de audio) al subir/eliminar/cambiar filtro, con
  boton para silenciar.
- **Confirmaciones a prueba de pantallas pequeñas**: los dialogos de
  "¿eliminar esto?" ahora son modales centrados, no popovers que se
  puedan cortar en movil.

---

## 🧩 4 modos de interfaz (elegibles por tablero)

Ya no existe un solo formato de lienzo. Al crear un tablero, eliges:

- **Collage libre** — el lienzo original: arrastra, rota y superpone
  libremente.
- **Álbum** — los recuerdos se agrupan en páginas que se voltean con
  una animación 3D, como un libro físico.
- **Línea de tiempo** — todo ordenado cronológicamente sobre una línea
  horizontal navegable, con la fecha de cada recuerdo.
- **Presentación** — un recorrido automático tipo diapositivas por
  todos los recuerdos, con controles de play/pausa/anterior/siguiente.

Cada modo comparte la misma base de datos y las mismas herramientas de
creación (subir foto, generar con IA, añadir cartelito) — cambiar de
modo no mueve ni pierde nada, solo cambia cómo se presenta.

## 🎨 3 temas visuales

Además del modo, cada tablero tiene un tema: **Neón/Glitch** (el
original), **Scrapbook vintage** (tonos cálidos, tipografía
manuscrita) o **Pastel suave**. Se define en `lib/temas.ts`.

## ⏳ Cápsula del tiempo

Al crear un tablero puedes ponerle una fecha de revelación. Mientras
esa fecha no llegue, el tablero se muestra bloqueado con una cuenta
regresiva en vivo (días/horas/min/seg) en vez de su contenido — ideal
para que el regalo se "abra" justo el día especial.

## 🏗️ Arquitectura (para quien quiera seguir extendiendo)

Toda la lógica de datos (subir, IA, texto, eliminar, filtro, escala,
paleta) vive en un solo lugar: `lib/useLienzo.ts`, un hook reutilizado
por los 4 modos. Las piezas de UI compartidas —`BarraCreacion`,
`ModalEliminar`, `TarjetaSticker`— tampoco se repiten por modo. Si se
agrega un modo 5 en el futuro, solo hay que construir cómo se ve/navega,
no repetir la lógica de Supabase.
