# Despliegue en Vercel

## Configuración en Vercel Dashboard

**Settings → General → Root Directory:** `frontend`

| Campo | Valor |
|-------|-------|
| Root Directory | `frontend` |
| Build Command | (vacío — lo define `vercel.json`) |
| Output Directory | `dist` |
| Install Command | (vacío — lo define `vercel.json`) |

## Variables de entorno

**Settings → Environment Variables** (marca Production, Preview y Development):

```env
DATABASE_URL=postgresql://...@ep-xxxx-pooler.neon.tech/neondb?sslmode=require
DATABASE_SSL=true
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret
ADMIN_USERNAME=admin_valma
ADMIN_PASSWORD=tu_contraseña
JWT_SECRET=clave_larga_y_segura
JWT_EXPIRES_IN=24h
CORS_ORIGIN=https://tu-app.vercel.app
VITE_LOGO_URL=/logo.png
```

> `CORS_ORIGIN` debe ser la URL exacta de tu app (ej. `https://valma-inventario.vercel.app`).

### DATABASE_URL con Neon (evita 504)

Usa la URL del **pooler** (incluye `-pooler` en el host):

```
postgresql://user:pass@ep-xxxx-pooler.region.aws.neon.tech/neondb?sslmode=require
```

No uses la URL directa sin pooler en serverless.

## Base de datos (una vez desde tu PC)

```powershell
cd C:\Users\Fiury\Valma_inventario
npm run db:migrate
```

## Verificar

1. Push al repo → Vercel redeploy automático
2. Abre `https://tu-app.vercel.app/api/health` → `{"status":"ok","db":"connected",...}`
3. Login en `https://tu-app.vercel.app`

## Si sale Error 504 (Gateway Timeout)

| Causa | Solución |
|-------|----------|
| URL de Neon sin pooler | Usa `ep-xxx-pooler.neon.tech` en `DATABASE_URL` |
| Cold start + BD lenta | Reintenta; la 1.ª petición puede tardar unos segundos |
| Plan Hobby Vercel | Límite **10 s** por función (configurado en `vercel.json`) |
| BD caída | `/api/health` con `db: unavailable` → revisa Neon |

## Si sale "No se pudo conectar al servidor"

| Revisa | Debe ser |
|--------|----------|
| Root Directory | `frontend` |
| `/api/health` | Responde JSON, no 404 |
| Variables en Vercel | `DATABASE_URL`, `JWT_SECRET`, `ADMIN_*` definidas |
| Redeploy | Después de cambiar variables |

## Arquitectura

```
tu-app.vercel.app
  ├── /           → React (dist/)
  └── /api/*      → Express serverless (frontend/api/index.mjs)
        └── Neon + Cloudinary
```
