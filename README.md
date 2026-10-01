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

## Gemini API (opcional)

La app funciona **sin API key** con un motor offline de ajustes y respuestas.

Para activar IA real:

1. Crea una clave gratuita en [Google AI Studio](https://aistudio.google.com/apikey).
2. Opción A — en la app: **Perfil → Clave Gemini**.
3. Opción B — archivo `.env` (copia `.env.example`):

```env
VITE_GEMINI_API_KEY=tu_clave_aqui
```

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
