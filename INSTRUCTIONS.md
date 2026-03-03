# Full-Stack Engineer — Prueba Técnica

## Descripción General

Construí un **Dashboard de Reporting Multi-Canal** — una aplicación Next.js que provee una función de reporting para una plataforma multi-tenant. Cada organización tiene cuentas de publicidad conectadas (Meta, Google) y una tienda. Tu trabajo es construir la lógica de reporting que agrega datos de estas fuentes, exponerla a través de un endpoint API, y renderizar un dashboard simple.

El entregable principal es una **función de reporting reutilizable** que:

1. Se llama **directamente** en un server component para renderizar el dashboard inicial (server-side)
2. También se expone a través de un **endpoint REST API** para que pueda ser consumida por componentes client-side o clientes externos

La tarea está diseñada para completarse en aproximadamente **tres a cuatro horas**.
En tu próxima entrevista, revisarás tu solución junto con el entrevistador.

---

## Herramientas y Tecnologías

| Capa          | Tecnología                                                       |
| ------------- | ---------------------------------------------------------------- |
| Framework     | **Next.js** (App Router, API Routes) — ya configurado            |
| Lenguaje      | **TypeScript**                                                   |
| Base de datos | **PostgreSQL**                                                   |
| ORM           | Opcional (Prisma, Drizzle, TypeORM, o SQL directo — tu elección) |
| UI            | **shadcn/ui** está pre-instalado, o usá CSS/Tailwind             |

---

## Base de Datos

El schema y los datos de prueba están en `database/seed.sql`. Ejecutá este archivo contra tu base de datos PostgreSQL para crear y poblar todas las tablas.

```bash
psql -U tu_usuario -d tu_base_de_datos -f database/seed.sql
```

El script crea las siguientes tablas:

### `organization`

| Columna           | Tipo                        | Notas                                              |
| ----------------- | --------------------------- | -------------------------------------------------- |
| id                | integer, PK, auto-increment |                                                    |
| name              | string                      |                                                    |
| meta_account_id   | string                      | Identificador de la cuenta de Meta Ads vinculada   |
| google_account_id | string                      | Identificador de la cuenta de Google Ads vinculada |
| store_id          | string                      | Identificador de la tienda vinculada               |
| created_at        | timestamp                   |                                                    |

### `meta_ads_data`

| Columna     | Tipo                        | Notas                          |
| ----------- | --------------------------- | ------------------------------ |
| id          | integer, PK, auto-increment |                                |
| account_id  | string                      | Referencia a la cuenta de Meta |
| date        | date                        | Fecha del reporte              |
| spend       | decimal(12,2)               | Monto gastado en USD           |
| impressions | integer                     | Cantidad de impresiones        |

### `google_ads_data`

| Columna     | Tipo                        | Notas                            |
| ----------- | --------------------------- | -------------------------------- |
| id          | integer, PK, auto-increment |                                  |
| account_id  | string                      | Referencia a la cuenta de Google |
| date        | date                        | Fecha del reporte                |
| spend       | decimal(12,2)               | Monto gastado en USD             |
| impressions | integer                     | Cantidad de impresiones          |

### `store_data`

| Columna  | Tipo                        | Notas                                |
| -------- | --------------------------- | ------------------------------------ |
| id       | integer, PK, auto-increment |                                      |
| store_id | string                      | Referencia a la tienda               |
| date     | date                        | Fecha de la orden                    |
| revenue  | decimal(12,2)               | Ingresos totales                     |
| orders   | integer                     | Cantidad de órdenes                  |
| fees     | decimal(12,2)               | Comisiones de plataforma/transacción |

Los datos de prueba incluyen **2 organizaciones** con **30 días** de datos diarios en las tres fuentes de datos.

---

## Métricas Disponibles

Cada fuente de datos provee **métricas crudas**. Algunas métricas son **calculadas** a partir de valores crudos, y otras son **derivadas** combinando datos de múltiples fuentes.

### Métricas Crudas (almacenadas en la DB)

| Fuente     | Métricas                             |
| ---------- | ------------------------------------ |
| Meta Ads   | `meta_spend`, `meta_impressions`     |
| Google Ads | `google_spend`, `google_impressions` |
| Tienda     | `revenue`, `orders`, `fees`          |

### Métricas Calculadas

| Métrica               | Fórmula                                    |
| --------------------- | ------------------------------------------ |
| `meta_cpm`            | (meta_spend / meta_impressions) × 1000     |
| `google_cpm`          | (google_spend / google_impressions) × 1000 |
| `average_order_value` | revenue / orders                           |

### Métricas Derivadas

| Métrica       | Fórmula                                    |
| ------------- | ------------------------------------------ |
| `total_spend` | meta_spend + google_spend                  |
| `profit`      | revenue − meta_spend − google_spend − fees |
| `roas`        | revenue / total_spend                      |

---

## Función de Reporting

Construí una función de reporting que acepte:

```typescript
{
  orgId: number;
  startDate: string;   // "YYYY-MM-DD"
  endDate: string;     // "YYYY-MM-DD"
  metrics: string[];   // ej. ["revenue", "meta_spend", "profit"]
}
```

Y retorne tanto los **totales** (agregados sobre el rango de fechas completo) como un **desglose diario** (una fila por día con las métricas solicitadas):

```json
{
  "totals": {
    "revenue": 45000.0,
    "meta_spend": 12000.0,
    "profit": 18500.0
  },
  "daily": [
    {
      "date": "2025-01-01",
      "revenue": 1500.0,
      "meta_spend": 400.0,
      "profit": 620.0
    },
    {
      "date": "2025-01-02",
      "revenue": 1320.0,
      "meta_spend": 380.0,
      "profit": 510.0
    }
  ]
}
```

La función debe retornar únicamente las métricas que fueron solicitadas.

---

## Endpoint API

### `GET /api/reporting`

Exponé la función de reporting como un endpoint REST.

Parámetros de query:

- `orgId` (requerido) — El ID de la organización
- `startDate` (requerido) — Inicio del rango de fechas (YYYY-MM-DD)
- `endDate` (requerido) — Fin del rango de fechas (YYYY-MM-DD)
- `metrics` (requerido) — Lista de métricas separadas por coma (ej. `metrics=revenue,meta_spend,profit`)

---

## Dashboard UI

### Carga Inicial (Server-Side)

Cuando la página (`/`) carga, debe renderizar datos **en el servidor** llamando a la función de reporting directamente (no vía HTTP). Usá valores por defecto para el rango de fechas y las métricas para que el usuario vea datos inmediatamente en la primera carga.

### Controles Interactivos (Client-Side)

La página debe incluir controles interactivos que permitan al usuario:

- **Seleccionar un rango de fechas** — Dos inputs de fecha (fecha inicio y fecha fin)
- **Elegir métricas** — Seleccionar qué métricas mostrar

Cuando el usuario cambie los controles, obtené datos actualizados desde el endpoint `/api/reporting` y re-renderizá.

### Visualización de Datos

1. **Cards de métricas** — Mostrá los `totals` de cada métrica seleccionada (ej. una card para "Revenue: $45,000", una card para "Profit: $18,500")
2. **Tabla de desglose diario** — Una tabla simple mostrando una fila por día con columnas para cada métrica seleccionada

Mantené la UI limpia y funcional. Valoramos usabilidad por sobre diseño visual.

---

## Entregables

Pusheá tu solución a este repositorio. Asegurate de incluir:

- Código fuente completo
- **README.md** actualizado con:
  - Cómo configurar la base de datos y ejecutar el seed
  - Cómo instalar dependencias e iniciar la aplicación
  - Breve explicación de tu arquitectura y decisiones clave

---

Mucha suerte! Esperamos ver tu solución.
