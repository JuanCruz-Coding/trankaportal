# TrankaPortal

SaaS de gestión de Recursos Humanos para PyMEs. Multi-tenant, con módulos de empleados, ausencias, asistencia y portal del empleado.

> **Live demo**: [trankaportal.vercel.app](https://trankaportal.vercel.app)

## Features

| Módulo | Quién lo usa | Qué hace |
|---|---|---|
| **Auth + Multi-tenant** | Todos | Sign-up, organizations, invitaciones via Clerk |
| **Empleados** | HR / Admin / Manager | ABM con datos personales/laborales, documentos adjuntos, organigrama jerárquico |
| **Self-service** | Empleado | Edita su perfil, ve su saldo, descarga sus documentos |
| **Ausencias** | Todos | Solicitudes, aprobaciones, saldo anual, calendario de equipo |
| **Asistencia** | Todos | Check-in/out diario, reporte mensual por empleado |
| **Planes** | Admin | Starter / Pro / Business con feature gating por plan |

Roles: `EMPLOYEE`, `MANAGER`, `HR`, `ADMIN`. Manager solo ve su equipo directo.

## Stack

- **Framework**: [Next.js 16](https://nextjs.org) (App Router + Turbopack)
- **Lenguaje**: TypeScript
- **Estilos**: [Tailwind CSS v4](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com) (Base UI)
- **Auth**: [Clerk](https://clerk.com) con Organizations
- **Database**: PostgreSQL en [Supabase](https://supabase.com)
- **ORM**: [Prisma 7](https://prisma.io) con driver adapter (`@prisma/adapter-pg`)
- **Storage**: Supabase Storage (documentos)
- **Email**: [Resend](https://resend.com) (provider abstraído — fallback a console logger)
- **Validación**: [Zod 4](https://zod.dev)
- **Forms**: [React Hook Form](https://react-hook-form.com)
- **Deploy**: [Vercel](https://vercel.com)

## Setup local

### Pre-requisitos

- Node.js 20 LTS o superior
- Cuentas en: Supabase, Clerk (free tiers alcanzan)

### 1. Clonar e instalar

```bash
git clone https://github.com/JuanCruz-Coding/trankaportal.git
cd trankaportal
npm install
```

### 2. Setup de Supabase

- Crear proyecto en [supabase.com](https://app.supabase.com).
- **Settings → Database** → copiar:
  - `Transaction pooler` (port 6543) → `DATABASE_URL`
  - `Session pooler` (port 5432) → `DIRECT_URL`
  - **URL-encodear** la password si tiene caracteres especiales (`/`, `?`, `,`).
- **Settings → API** → copiar:
  - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
  - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `service_role secret` → `SUPABASE_SERVICE_ROLE_KEY` ⚠️ NUNCA exponer al cliente
- **Storage → New bucket** → nombre `employee-documents`, **privado**.

### 3. Setup de Clerk

- Crear app en [clerk.com](https://dashboard.clerk.com).
- **Organizations Management** → activar **Enable organizations**.
- Crear roles (en minúsculas): `admin`, `hr`, `manager`, `employee`.
- **API Keys** → copiar `Publishable key` y `Secret key`.
- (Opcional para producción) **Webhooks** → crear endpoint apuntando a `https://TU-DOMINIO/api/webhooks/clerk`, suscribir eventos:
  - `organization.created`, `organization.updated`, `organization.deleted`
  - `organizationMembership.created`, `organizationMembership.deleted`
  - `user.updated`
  - Copiar el `Signing Secret` → `CLERK_WEBHOOK_SIGNING_SECRET`.

### 4. Variables de entorno

Copiar `.env.example` a `.env.local` y completar:

```bash
cp .env.example .env.local
```

```env
# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase Postgres
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Supabase Storage / API
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SIGNING_SECRET=whsec_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/

# Email (opcional — defaults a console logger si están vacías)
RESEND_API_KEY=
RESEND_FROM_EMAIL=
EMAIL_PROVIDER=console
```

### 5. Migraciones + seed

```bash
# Aplicar el schema a la DB
npx prisma migrate deploy

# Cargar Plans + Features (catálogo global)
npx prisma db seed

# Opcional — datos demo (12 empleados, ausencias, asistencia)
npx tsx scripts/demo-seed.ts
```

### 6. Correr

```bash
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000), registrarse, crear una organización. El webhook de Clerk (si está configurado) crea automáticamente el `Employee`, `Subscription` Starter y `TimeOffType`s default.

## Estructura del proyecto

```
app/
├── (auth)/                  → /sign-in, /sign-up
├── api/webhooks/clerk/      → handler del webhook de Clerk
└── dashboard/               → todas las rutas protegidas
    ├── employees/           → ABM, organigrama, documentos
    ├── time-off/            → solicitudes, aprobaciones, calendario
    ├── attendance/          → check-in/out, reporte de equipo
    ├── profile/             → portal self-service
    └── settings/            → plan + config de org

components/
├── ui/                      → primitivos shadcn
├── layout/                  → sidebar, header, mobile nav
└── feature-gate.tsx         → bloqueo por plan

lib/
├── prisma.ts                → cliente Prisma con adapter
├── tenant.ts                → getOrgContext, requireRole, RBAC
├── features.ts              → hasFeature, getOrgFeatures
├── supabase.ts              → cliente admin para Storage
├── email.ts                 → provider abstraído (console / Resend)
└── validations/             → schemas Zod compartidos

prisma/
├── schema.prisma            → modelos
├── migrations/              → migraciones versionadas
└── seed.ts                  → catálogo de Plans/Features

scripts/
└── demo-seed.ts             → datos demo (12 empleados, ausencias, etc.)
```

## Multi-tenant safety

Toda la lógica de aislamiento entre tenants pasa por `lib/tenant.ts`:

- **`getOrgContext()`** es el único punto que devuelve `organizationId`. Todas las queries Prisma filtran por ese id.
- **`requireRole(ctx, ["admin", "hr"])`** chequea autorización en server actions.
- **Cada tabla del schema** tiene `organizationId` con `@@index([organizationId])` y `onDelete: Cascade` desde `Organization`.

Nunca pasar `organizationId` desde el cliente al server: siempre se obtiene del session de Clerk vía `getOrgContext()`.

## Deploy en Vercel

```bash
git push
```

Vercel detecta el push y deploya. El primer deploy:

1. Conectar el repo en [vercel.com/new](https://vercel.com/new).
2. Cargar TODAS las env vars de `.env.example` (excepto `NEXT_PUBLIC_APP_URL` que apunta a la URL de Vercel).
3. Deploy.
4. (Opcional) Configurar el webhook de Clerk apuntando a la URL de Vercel y agregar `CLERK_WEBHOOK_SIGNING_SECRET`.

`postinstall` corre `prisma generate`. `build` corre `prisma generate && next build`.

Migraciones a prod se aplican manualmente (no en build):

```bash
npx prisma migrate deploy
```

## Limitaciones conocidas

- **Multi-org por usuario**: `Employee.clerkUserId` es `@unique` global. Un Clerk user pertenece a UNA organización en TrankaPortal. Aceptable para el target (PyMEs argentinas).
- **Saldo de vacaciones**: configurable solo a nivel org, no por empleado.
- **Asistencia**: 1 check-in + 1 check-out por día. No soporta múltiples segmentos (almuerzo, etc.).
- **Feriados**: el cálculo de días hábiles excluye sábados y domingos. No considera feriados nacionales — HR puede ajustar `totalDays` manualmente al aprobar.
- **Stripe**: la integración de billing está stubbed (campos `stripeCustomerId`, `stripeSubscriptionId` en `Subscription`). Los planes se cambian gratis desde Settings.

## Licencia

Privado, todos los derechos reservados.
