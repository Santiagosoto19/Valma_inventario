import { Router } from 'express';
import { db } from '../controllers/debugController.js';

const router = Router();

router.get('/db', db);

export default router;
