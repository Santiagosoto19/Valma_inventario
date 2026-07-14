# Valma Inventario

Sistema completo de gestión de inventario y contabilidad comercial con arquitectura limpia.

## Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Node.js + Express |
| Base de datos | PostgreSQL en [Neon](https://neon.tech) |
| Tiempo real | Socket.io (alertas de stock) |

## Arquitectura

```
Valma_inventario/
├── database/
│   └── schema.sql          # Script de creación de BD
├── backend/
│   └── src/
│       ├── config/         # DB, Socket.io
│       ├── controllers/    # Controladores HTTP
│       ├── services/       # Lógica de negocio
│       ├── routes/         # Rutas API
│       └── middleware/     # Upload de imágenes
└── frontend/
    └── src/
        ├── pages/          # Módulos UI
        ├── components/     # Componentes reutilizables
        ├── context/        # Notificaciones en tiempo real
        └── services/       # Cliente API
```

## Requisitos Previos

- Node.js 18+
- Cuenta en [Neon](https://neon.tech) (PostgreSQL serverless)

## Instalación rápida

Desde la raíz del proyecto, un solo comando levanta **backend + frontend**:

```bash
npm install
npm run start
```

| Servicio  | URL |
|-----------|-----|
| Frontend  | http://localhost:5173 |
| Backend   | http://localhost:3001 |
| Login     | http://localhost:5173/login |

**Credenciales por defecto** (configurables en `backend/.env`):
- Usuario: `admin`
- Contraseña: `admin123`

## Instalación detallada

### 1. Base de datos en Neon

1. Crea un proyecto en [Neon Console](https://console.neon.tech)
2. Copia el **Connection string** (modo *Pooled* o *Direct*; ambos funcionan)
3. Asegúrate de que incluya `?sslmode=require`

**Opción A — Script Node (recomendado):**

```bash
cd backend
cp .env.example .env
# Pega tu DATABASE_URL de Neon en .env

npm install
npm run db:init      # Crea tablas, índices y configuración
npm run db:seed      # Opcional: datos de ejemplo
```

**Opción B — SQL Editor de Neon:**

Abre el **SQL Editor** en el dashboard de Neon y ejecuta el contenido de:
- `database/schema.sql`
- `database/seed.sql` (opcional)

**Opción C — psql:**

```bash
psql "postgresql://usuario:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require" -f database/schema.sql
psql "postgresql://usuario:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require" -f database/seed.sql
```

### 2. Variables de entorno y arranque

```bash
# En la raíz del proyecto
npm install          # Instala dependencias de backend y frontend
npm run db:init      # Primera vez: crea tablas en Neon
npm run db:seed      # Opcional: datos de ejemplo
npm run start        # Levanta API (3001) + Web (5173)
```

Configura `backend/.env` con tu `DATABASE_URL` de Neon antes del primer arranque.

### 3. Backend (por separado, opcional)

```bash
cd backend
cp .env.example .env
# Configura DATABASE_URL con tu connection string de Neon

npm install
npm run dev
```

El servidor inicia en `http://localhost:3001`

### 4. Frontend (por separado, opcional)

```bash
cd frontend
npm install
npm run dev
```

La aplicación inicia en `http://localhost:5173`

## API Endpoints

### Productos
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/products` | Listar productos |
| GET | `/api/products/low-stock` | Productos con stock crítico |
| GET | `/api/products/:id` | Obtener producto |
| POST | `/api/products` | Crear producto (multipart/form-data) |
| PUT | `/api/products/:id` | Actualizar producto |
| DELETE | `/api/products/:id` | Eliminar producto |

### Ventas
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/sales` | Completar venta (transacción atómica) |
| GET | `/api/sales/:id` | Obtener factura |
| GET | `/api/sales` | Listar ventas |

### Contabilidad
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/accounting/dashboard` | Resumen diario + mensual |
| GET | `/api/accounting/daily?date=YYYY-MM-DD` | Cierre diario |
| GET | `/api/accounting/monthly?year=2026&month=7` | Cierre mensual |

### Configuración
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/settings` | Obtener configuración |
| PATCH | `/api/settings` | Actualizar umbral de stock |

## Módulos Funcionales

### 1. Contabilidad y Flujo de Caja
- Agrupación por día con consolidación mensual automática
- Separación de ingresos: Efectivo (Cash) y Nequi
- Panel de cierre con totales del día y histórico mensual

### 2. Inventario (CRUD)
- Campos: imagen (URL o archivo), nombre, descripción, stock, precio
- Operaciones: crear, editar, listar, eliminar

### 3. Alertas de Stock Crítico
- Vista dedicada de productos en escasez
- Umbral configurable desde la UI
- Notificaciones push en tiempo real vía Socket.io

### 4. Punto de Venta
- Carrito dinámico con cálculo en tiempo real
- **Terminar Venta** ejecuta transacción atómica:
  1. Genera factura digital
  2. Descuenta stock del inventario
  3. Registra ingreso en contabilidad (Cash/Nequi)

## Variables de Entorno (Backend)

```env
PORT=3001

# Connection string de Neon (Dashboard → Connection Details)
DATABASE_URL=postgresql://usuario:password@ep-xxxx.region.aws.neon.tech/neondb?sslmode=require
DATABASE_SSL=true

UPLOAD_DIR=uploads
CORS_ORIGIN=http://localhost:5173
```

> **Nota Neon:** El backend detecta automáticamente URLs de `neon.tech` y habilita SSL. Si usas otro host con SSL, define `DATABASE_SSL=true`.

## Almacenamiento de Imágenes (Cloudinary)

Las imágenes de productos se suben a **Cloudinary** (CDN global). La URL se guarda en Neon.

| Entorno | Almacenamiento | URL en la BD |
|---------|----------------|--------------|
| **Con Cloudinary** | Carpeta `valma/products` | `https://res.cloudinary.com/...` |
| **Desarrollo local** (sin credenciales) | `backend/uploads/` | `/uploads/archivo.jpg` |
| **URL manual** | No se sube archivo | La URL que ingreses |

### Configurar Cloudinary

1. Crea cuenta en [cloudinary.com](https://cloudinary.com)
2. Dashboard → **API Keys** → copia Cloud Name, API Key y API Secret
3. Agrégalos en `backend/.env`:

```env
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret
```

### Despliegue en Vercel

Todo el proyecto (frontend + API) se despliega en **Vercel**. Guía completa: **[DEPLOY_VERCEL.md](./DEPLOY_VERCEL.md)**

```
Vercel (frontend + API serverless) → Neon (datos) + Cloudinary (imágenes)
```

1. Root Directory: **vacío** (raíz del repo)
2. Variables en Vercel: `DATABASE_URL`, `CLOUDINARY_*`, `ADMIN_*`, `JWT_SECRET`, `CORS_ORIGIN`
3. **No** definas `VITE_API_URL` en producción
4. Ejecuta `npm run db:migrate` una vez desde tu PC

> **Error "No output directory called public"?** En Vercel → Settings → Build → cambia **Output Directory** a `frontend/dist`.

## Licencia

Proyecto privado — Valma Inventario © 2026
