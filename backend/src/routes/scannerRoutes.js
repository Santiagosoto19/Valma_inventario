import { Router } from 'express';
import { getScannerStatus } from '../controllers/scannerController.js';

const router = Router();

router.get('/status', getScannerStatus);

export default router;
