# Reporting Dashboard — Prueba Técnica

## Para Empezar

1. Instalá dependencias:

```bash
npm install
```

2. Configurá una variable de entorno `DB_URL` apuntando a tu PostgreSQL (ejemplo):

```bash
DB_URL=postgres://tu_usuario:tu_password@localhost:5432/tu_base_de_datos
```

3. Configurá tu base de datos PostgreSQL y ejecutá el script de seed:

```bash
psql -U tu_usuario -d tu_base_de_datos -f database/seed.sql
```

4. Iniciá el servidor de desarrollo:

```bash
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000) para ver la app.

## Pre-instalado

- **Next.js** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **shadcn/ui** (listo para usar — agregá componentes con `npx shadcn@latest add [componente]`)

## PostgreSQL con Docker Compose

1. Levantar PostgreSQL:

```bash
docker compose up -d
```

2. Usar este `DB_URL` para la app:

```bash
DB_URL=postgres://postgres:postgres@localhost:5432/reporting
```

El seed `database/seed.sql` se ejecuta automáticamente **solo la primera vez** que se inicializa el volumen.
Si querés re-ejecutarlo desde cero:

```bash
docker compose down -v
docker compose up -d
```

## Arquitectura

- **Reporting reutilizable**: `lib/reporting.ts` expone `getReporting({ orgId, startDate, endDate, metrics })`.
- **Acceso a DB**: `lib/db.ts` usa `pg` con `DB_URL`.
- **API**: `GET /api/reporting` en `app/api/reporting/route.ts` parsea query params y llama a `getReporting`.
- **Dashboard**:
  - Render inicial server-side en `app/page.tsx` llamando `getReporting` directamente.
  - Controles client-side en `components/ReportingDashboardClient.tsx` que refetch a `/api/reporting`.
