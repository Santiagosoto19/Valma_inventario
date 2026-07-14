import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import { createCorsOptions } from './config/cors.js';
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
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use('/uploads', express.static(uploadDir));

  app.get('/', (_req, res) => {
    res.json({
      name: 'Valma Inventario API',
      health: '/api/health',
      status: 'running',
    });
  });

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/api/auth', authRoutes);

  app.use('/api', authenticate);
  app.use('/api/products', productRoutes);
  app.use('/api/sales', saleRoutes);
  app.use('/api/accounting', accountingRoutes);
  app.use('/api/settings', settingsRoutes);

  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(err.message?.includes('imágenes') ? 400 : 500).json({
      error: err.message || 'Error interno del servidor',
    });
  });

  return app;
}
