# Mi Gordólogo

App web (Mobile First / PWA) de planificación nutricional personalizada con seguimiento antropométrico.
Dieta de **1.500 kcal** del Hospital Morales Meseguer — pensada para María Ignacia y reutilizable multi-usuario.

## Requisitos

- Node.js 20+
- npm 10+

## Arranque local

```bash
cd mi-gordologo
npm install
npm run dev
```

Abre la URL que muestre Vite (normalmente `http://localhost:5173`).

## Build de producción

```bash
npm run build
npm run preview
```

## IA Gemini (una sola clave, superadmin)

La app funciona sin IA (motor de la dieta). La clave de Google **no se pega en cada móvil**.

1. Monta Supabase (`supabase/schema.sql`; si el proyecto ya existía, ejecuta también `supabase/schema_users.sql`) y publica la función `gordologo`.
2. Secrets de GitHub Pages: `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (la anon es pública a propósito; **nunca** pongas la clave Gemini ahí).
3. Primera vez en la app: contraseña de Pepe (mín. 8) y de María (mín. 6). Entra como Pepe y pega la clave Gemini en **Mi Perfil → Superadmin**.
4. Queda en el servidor. Cualquier perfil logueado usa la IA. Cada usuario entra con su contraseña; Pepe puede abrir todos.

## Despliegue en GitHub Pages

1. Sube el contenido de `mi-gordologo/` a un repositorio GitHub.
2. En **Settings → Pages**, fuente: **GitHub Actions**.
3. El workflow `.github/workflows/deploy.yml` construye y publica en cada push a `main`.

También puedes lanzar el workflow a mano desde la pestaña Actions.

```bash
npm run build
# El artefacto está en dist/
```

## Instalar como app en el móvil

1. Abre la URL publicada en Chrome (Android) o Safari (iPhone).
2. **Añadir a pantalla de inicio** / Instalar app.
3. Funciona a pantalla completa con icono propio.

## Funciones principales

- Menú de 8 semanas (21+21 platos hospitalarios + recena)
- Día libre configurable
- Lista de la compra generada desde el menú
- Seguimiento de peso / IMC / composición corporal
- Entrevista semanal del Gordólogo
- Chat de nutrición + ajustes de plato (IA o offline)
- Impresión A4 horizontal + WhatsApp / email
- PWA con service worker

## Estructura

```
src/
  data/           # Seed de menús del hospital
  domain/         # Modelos y servicios
  ui/             # Páginas y componentes
  shared/         # Utilidades (assets, etc.)
public/           # Logo, iconos PWA, SW, manifest
```

## Licencia

Uso personal / familiar.
