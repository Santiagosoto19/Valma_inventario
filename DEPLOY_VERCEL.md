# Despliegue en Vercel

Frontend + API serverless en un solo proyecto.

```
Usuario → Vercel
            ├── frontend (React)
            ├── /api/*  (Express serverless)
            ├── Neon (PostgreSQL)
            └── Cloudinary (imágenes)
```

## 1. Configurar Vercel

1. [vercel.com](https://vercel.com) → **Add New Project** → repo `Valma_inventario`
2. **Root Directory:** vacío (raíz del repo)
3. Vercel usa el `vercel.json` de la raíz

## 2. Variables de entorno

**Settings → Environment Variables:**

```env
DATABASE_URL=postgresql://...@neon.tech/neondb?sslmode=require
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

> El frontend llama a `/api` en el mismo dominio de Vercel. No necesitas variables de URL del backend.

## 3. Base de datos (una vez)

```powershell
cd C:\Users\Fiury\Valma_inventario
npm run db:migrate
```

## 4. Deploy y verificación

Push al repo → Vercel despliega automáticamente.

- `https://tu-app.vercel.app/api/health` → `{"status":"ok",...}`
- Login en `https://tu-app.vercel.app`

## Notas

| Aspecto | Comportamiento en Vercel |
|---------|--------------------------|
| API | Serverless (puede tardar ~1-3 s en la primera petición) |
| Alertas de stock | Polling cada 60 s (no Socket.io en producción) |
| Imágenes | Obligatorio configurar Cloudinary |

## Errores comunes

| Error | Solución |
|-------|----------|
| 405 en login | Root Directory = raíz del repo, no `frontend` |
| 500 en API | Revisa `DATABASE_URL` en Vercel |
| Imágenes no suben | Configura `CLOUDINARY_*` |
| CORS | `CORS_ORIGIN` = URL exacta de tu app |
