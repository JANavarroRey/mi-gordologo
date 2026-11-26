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

## Auth v3: registro público + aprobación estricta + bóveda cifrada + recuperación universal (gratis)

La app usa **Supabase Auth** (email/contraseña) con control de acceso en la Edge Function `gordologo`. Cualquiera con la URL puede **solicitar cuenta**; queda en estado `pending` y el administrador (`jose.navarrorey@gmail.com`) recibe aviso por email para aprobarla o rechazarla desde **Mi Perfil → Panel de Administración**.

La recuperación de contraseña funciona con **cualquier email** (Gmail, Hotmail, Outlook, Yahoo, iCloud…) mediante **código OTP de 6 dígitos** (15 min, máx. 5 intentos) + enlace directo inmune a Hotmail Safe Links, enviado gratis por Gmail SMTP.

### 1. SQL, Secretos y Edge Function

1. Ejecuta en el SQL Editor de Supabase (en orden si el proyecto es nuevo; en uno existente basta con `schema_auth_v3.sql`):
   - `supabase/schema.sql`
   - `supabase/schema_auth_v2.sql`
   - **`supabase/schema_auth_v3.sql`** (bóveda AES-256-GCM, códigos OTP, rate limiting, cierre RLS en `family_snapshots` y anclaje del rol `superadmin` a `jose.navarrorey@gmail.com`)
2. (Recomendado) Define una clave maestra dedicada para la bóveda cifrada y el email admin en Supabase Secrets:

```bash
npx supabase secrets set ADMIN_EMAIL=jose.navarrorey@gmail.com PASSWORD_VAULT_KEY="$(openssl rand -base64 32)" --project-ref nxrivvdxknfoqcjzoyeb
```

3. Despliega la Edge Function modular:

```bash
npx supabase functions deploy gordologo --project-ref nxrivvdxknfoqcjzoyeb
```

### 2. Email de recuperación gratuito (Gmail SMTP → cualquier destino)

**No hace falta Resend ni comprar dominio.** La app envía correos con el **Gmail del administrador** (SMTP con contraseña de aplicación de Google, cifrada en BD con AES-256-GCM), con SPF/DKIM/DMARC alineados para entregar en bandeja de entrada de Gmail, Hotmail, Outlook, Yahoo e iCloud:

1. En tu cuenta Google: **Seguridad** → activa **Verificación en 2 pasos** → **Contraseñas de aplicaciones** → crea una para «Correo» (16 caracteres).
2. Entra como administrador (`jose.navarrorey@gmail.com`) → **Mi Perfil → Panel de Administración → Correo de recuperación**.
3. Guarda tu Gmail completo y la contraseña de aplicación de 16 caracteres, y pulsa **Probar** hacia una cuenta Gmail y una Hotmail/Outlook para confirmar entrega.

### 3. Seguridad y aislamiento de usuarios

- Los usuarios `member` nunca ven el panel de administración (cargado en *chunk lazy* exclusivo del admin), ni contraseñas ajenas, ni ninguna mención a la clave API de Google Gemini.
- Nunca se guardan contraseñas en `localStorage`; el administrador consulta la bóveda descifrada únicamente en memoria desde su sesión verificada.
- Al cerrar sesión se purgan todos los datos de `localStorage` del usuario anterior.

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
