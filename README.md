# 🖤 STICKER BOMB DIGITAL — DedSec Edition

Lienzo de arte digital interactivo estilo *sticker bomb*, inspirado en la
estética hacktivista de Watch Dogs 2 (fanzine punk, glitch art, neones
fucsia/cian sobre negro). Permite crear varios tableros permanentes,
subir imágenes, arrastrarlas libremente por el lienzo y que todo quede
guardado automáticamente en Supabase.

---

## 1. Estructura del proyecto

```
sticker-bomb-dedsec/
├── app/
│   ├── layout.tsx        # Layout raíz, fuentes y metadata
│   ├── page.tsx          # Ensambla sidebar + canvas, efectos CRT
│   └── globals.css       # Tailwind + scanlines/CRT globales
├── components/
│   ├── SVGFilters.tsx       # Filtro SVG duotono DedSec (fucsia/cian)
│   ├── SidebarTableros.tsx  # Panel lateral: listar/crear tableros
│   └── StickerCanvas.tsx    # Lienzo: subir, arrastrar, guardar stickers
├── lib/
│   ├── supabaseClient.ts # Cliente único de Supabase
│   └── types.ts          # Interfaces TypeScript: Tablero, Sticker
├── sql/
│   └── schema.sql        # Script SQL para Supabase (tablas + policies)
├── .env.local.example
├── .gitignore
├── next.config.js
├── package.json
├── postcss.config.js
├── tailwind.config.ts
└── tsconfig.json
```

> Nota: todo vive en la raíz del proyecto (sin carpeta `src/`), y los
> nombres de archivo usan mayúscula/minúscula consistente para evitar
> el clásico error de Vercel con sistemas de archivos *case-sensitive*
> en Linux (a diferencia de macOS/Windows).

---

## 2. Configurar Supabase

1. Crea un proyecto gratuito en [supabase.com](https://supabase.com).
2. Ve a **SQL Editor > New query**, pega el contenido completo de
   [`sql/schema.sql`](./sql/schema.sql) y ejecútalo. Esto crea:
   - Tabla `tableros` (id, nombre, created_at)
   - Tabla `stickers` (id, tablero_id, image_url, x, y, rotation, scale,
     filter_type, z_index, created_at)
   - Políticas RLS básicas de lectura/escritura pública (capa gratuita,
     sin login).
3. ⚠️ **Paso manual obligatorio** — ve a **Storage > Create a new bucket**:
   - Nombre exacto: `imagenes_stickers`
   - Marca **Public bucket = ON**
   - Sin esto, las imágenes subidas no tendrán URL pública accesible.
4. Copia tus credenciales desde **Project Settings > API Keys**:

   > ⚠️ **Importante (cambio reciente de Supabase):** las claves clásicas
   > `anon` / `service_role` (JWT) están en proceso de retiro — se
   > deprecan a fines de 2026, y **los proyectos creados desde
   > noviembre de 2025 ya no las incluyen por defecto**. Ahora se usan:
   > - **Publishable key** (`sb_publishable_...`) → reemplaza a `anon`,
   >   segura para exponer en el navegador, es la que usa esta app.
   > - **Secret key** (`sb_secret_...`) → reemplaza a `service_role`,
   >   acceso total, **solo para backend**. Esta app no la necesita
   >   porque todo corre client-side.
   >
   > En el dashboard, asegúrate de estar en la pestaña **"API Keys"**
   > (no en "Legacy API Keys") y copia el **Project URL** y la
   > **Publishable key**. Si tu proyecto es antiguo y aún no migró,
   > puedes seguir usando la `anon key` de la pestaña Legacy — funciona
   > igual, solo pégala en la misma variable de entorno.

---

## 3. Instalación local

```bash
# 1. Crear el proyecto Next.js limpio (App Router, TS, Tailwind, sin src/)
npx create-next-app@latest sticker-bomb-dedsec --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*"
cd sticker-bomb-dedsec

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
# Inicializar el repositorio
git init

# Confirmar que .env.local NO se vaya a subir (ya está en .gitignore)
git status

# Añadir todo el proyecto
git add .

# Primer commit
git commit -m "feat: sticker bomb digital - DedSec edition inicial"

# Conectar con tu repositorio remoto (crea uno vacío antes en GitHub)
git branch -M main
git remote add origin https://github.com/TU_USUARIO/sticker-bomb-dedsec.git

# Primer push
git push -u origin main
```

Luego, en [vercel.com](https://vercel.com):
1. **Add New Project** → importa el repo recién subido.
2. En **Environment Variables**, agrega `NEXT_PUBLIC_SUPABASE_URL` y
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` con los mismos valores de tu
   `.env.local`.
3. Deploy. Al no depender de rutas con mayúsculas/minúsculas
   inconsistentes ni de carpeta `src/`, el build en Vercel (Linux)
   debería completarse sin errores de "Module not found".

---

## 5. Estética y filtros

- **Raw**: imagen original, sin procesar.
- **Hackeado (DedSec)**: clases de Tailwind agresivas —
  `contrast-[250%] saturate-[200%] hue-rotate-[180deg] invert` —
  aplicadas directamente sobre el `<img>`.
- **Duotono**: usa el filtro SVG global `#dedsec-duotone` (inyectado por
  `SVGFilters.tsx`), que remapea cualquier imagen a un degradado de dos
  tonos entre fucsia neón (`#ff007f`) y cian eléctrico (`#00f3ff`) sobre
  negro profundo, vía `<feComponentTransfer>`.

Todo el procesamiento ocurre 100% en el navegador del usuario: es
inmediato, gratuito e ilimitado, sin llamadas a APIs de imagen de pago.

---

## 6. Notas sobre persistencia

- Cada tablero es independiente: al seleccionar uno en la barra
  lateral, el canvas solo carga y guarda los stickers de ese
  `tablero_id`.
- Al soltar un sticker (`onDragEnd` de Framer Motion), sus coordenadas
  `x`/`y` se actualizan de inmediato en Supabase, así que la
  composición se queda "tal cual" la dejaron, incluso si cierran la
  pestaña.
- Si un tablero se crea vacío, se siembran automáticamente 3 stickers
  decorativos ("SYSTEM FAILURE", "DEDSEC", "TRUST YOUR GLITCH") para
  guiar visualmente a la persona que recibe el regalo.
