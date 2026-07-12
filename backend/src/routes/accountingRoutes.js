import { Router } from 'express';
import {
  dashboard,
  dailyReport,
  monthlyReport,
} from '../controllers/accountingController.js';

const router = Router();

router.get('/dashboard', dashboard);
router.get('/daily', dailyReport);
router.get('/monthly', monthlyReport);

export default router;
