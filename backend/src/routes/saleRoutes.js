import { Router } from 'express';
import { completeSale, getSale, listSales } from '../controllers/saleController.js';

const router = Router();

router.get('/', listSales);
router.get('/:id', getSale);
router.post('/', completeSale);

export default router;
