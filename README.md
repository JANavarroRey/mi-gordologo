# Mi Gordólogo

App web (Mobile First / PWA) de planificación nutricional personalizada con seguimiento antropométrico.
Dieta de **1.500 kcal** del Hospital Morales Meseguer — pensada para María Ignacia y reutilizable multi-usuario.

## Requisitos

- Node.js 20+
- npm 10+
- Proyecto Supabase (plan **Free**: Auth incluido, sin licencia de pago)

## Arranque local

```bash
cd mi-gordologo
cp .env.example .env   # rellena VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

Abre la URL que muestre Vite (normalmente `http://localhost:5173`).

## Build de producción

```bash
npm run build
npm run preview
```

## Auth: registro público + aprobación + email (gratis)

La app usa **Supabase Auth** (email/contraseña). Cualquiera con la URL puede **crear cuenta**; queda en estado `pending` hasta que un **superadmin** la apruebe en **Mi Perfil → Superadmin**.

La recuperación de contraseña usa el flujo nativo (`Olvidé mi contraseña` → email → `#/restablecer-clave`).

### 1. SQL y Edge Function

1. Ejecuta en el SQL Editor (en orden si el proyecto es nuevo):
   - `supabase/schema.sql` (o `schema_users.sql` si ya existía)
   - **`supabase/schema_auth_v2.sql`** (email, `auth_user_id`, `status`, trigger de alta, `app_acting`)
2. Redeploy la función:

```bash
supabase functions deploy gordologo
```

### 2. Auth en el Dashboard de Supabase

1. **Authentication → Providers**: Email habilitado.
2. **Confirm email**: recomendado ON (si usas SMTP real).
3. **URL configuration**:
   - Site URL: la URL de GitHub Pages (o `http://localhost:5173` en pruebas).
   - Redirect URLs (añade ambas):
     - `http://localhost:5173/#/restablecer-clave`
     - `https://TU_USUARIO.github.io/TU_REPO/#/restablecer-clave`
     - también la raíz del sitio sin hash, por si Auth redirige ahí.

### 3. SMTP gratuito (Resend) — obligatorio para emails reales

El SMTP **incluido** de Supabase solo manda a emails del equipo del proyecto (~2/hora). Para compartir la app:

1. Crea cuenta gratis en [Resend](https://resend.com) (capa free ~3.000 emails/mes).
2. Verifica un dominio (o usa el dominio de prueba de Resend mientras pruebas).
3. En Supabase → **Authentication → SMTP**:
   - Host: `smtp.resend.com`
   - Port: `465` (SSL) o el que indique Resend
   - User: `resend`
   - Password: API key de Resend
   - Sender email: una dirección de tu dominio verificado

Sin esto, el registro/recuperación fallará para emails que no sean del equipo de Supabase.

### 4. Primera vez en la app

1. Secrets / `.env`: `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (**nunca** la clave Gemini ni la service role en el cliente).
2. Abre la app: pantalla **Primer administrador** (email + contraseña mín. 8).
3. Entra y pega la clave Gemini en **Mi Perfil → Superadmin**.
4. Comparte la URL: la gente se registra sola; tú apruebas en la cola de pendientes.

### 5. Migrar Pepe / María ya existentes

Si ya tenías filas `pepe` / `maria_ignacia` sin Auth:

1. Crea el usuario en **Authentication → Users** (o usa «Primer administrador» en un entorno limpio).
2. Vincula con el helper SQL de `schema_auth_v2.sql`:

```sql
select public.link_app_user_to_auth(
  'pepe',
  'UUID-DEL-AUTH-USER',
  'tu@email.com',
  'approved',
  'superadmin'
);
```

## IA Gemini (una sola clave, superadmin)

La app funciona sin IA (motor de la dieta). La clave de Google **no se pega en cada móvil**: solo el superadmin la guarda en el servidor.

## Despliegue en GitHub Pages

1. Sube el contenido de `mi-gordologo/` a un repositorio GitHub.
2. En **Settings → Pages**, fuente: **GitHub Actions**.
3. El workflow `.github/workflows/deploy.yml` construye y publica en cada push a `main`.
4. Secrets: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

```bash
npm run build
# El artefacto está en dist/
```

## Instalar como app en el móvil

1. Abre la URL publicada en Chrome (Android) o Safari (iPhone).
2. **Añadir a pantalla de inicio** / Instalar app.
3. Funciona a pantalla completa con icono propio.

## Funciones principales

- Registro por email + aprobación de admin
- Recuperación de contraseña por email
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
  domain/         # Modelos y servicios (Auth Supabase, sync)
  ui/             # Páginas y componentes
  shared/         # Utilidades (assets, etc.)
public/           # Logo, iconos PWA, SW, manifest
supabase/
  schema_auth_v2.sql
  functions/gordologo/
```

## Licencia

Uso personal / familiar.
