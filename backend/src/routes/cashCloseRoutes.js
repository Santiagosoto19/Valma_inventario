import { Router } from 'express';
import {
  closeToday,
  getToday,
  listCloses,
  lockToday,
  openClose,
} from '../controllers/cashCloseController.js';

const router = Router();

router.get('/today', getToday);
router.get('/', listCloses);
router.post('/open', openClose);
router.post('/close', closeToday);
router.patch('/lock', lockToday);

export default router;
