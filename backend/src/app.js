import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import { createCorsOptions } from './config/cors.js';
import { pingDatabase } from './config/database.js';
import { requestTimeout } from './middleware/requestTimeout.js';
import { uploadDir } from './middleware/upload.js';
import { authenticate } from './middleware/auth.js';
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import saleRoutes from './routes/saleRoutes.js';
import accountingRoutes from './routes/accountingRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';

dotenv.config();

export function createApp() {
  const app = express();

  app.use(cors(createCorsOptions()));
  app.use(requestTimeout(process.env.VERCEL ? 9_000 : 25_000));
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.use('/uploads', express.static(uploadDir));

  app.get('/', (_req, res) => {
    res.json({
      name: 'Valma Inventario API',
      health: '/api/health',
      status: 'running',
    });
  });

  app.get('/api/health', async (_req, res) => {
    try {
      await pingDatabase(5_000);
      res.json({
        status: 'ok',
        db: 'connected',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(503).json({
        status: 'degraded',
        db: 'unavailable',
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  });

  app.use('/api/auth', authRoutes);

  app.use('/api', authenticate);
  app.use('/api/products', productRoutes);
  app.use('/api/sales', saleRoutes);
  app.use('/api/accounting', accountingRoutes);
  app.use('/api/settings', settingsRoutes);

  app.use((err, _req, res, _next) => {
    console.error(err);
    if (res.headersSent) return;

    const isTimeout = err.message?.startsWith('TIMEOUT');
    const status = isTimeout ? 504 : err.message?.includes('imágenes') ? 400 : 500;

    res.status(status).json({
      error: isTimeout
        ? 'Tiempo de espera agotado. Intenta de nuevo.'
        : err.message || 'Error interno del servidor',
    });
  });

  return app;
}
