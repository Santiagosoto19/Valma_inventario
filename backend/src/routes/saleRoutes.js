import { Router } from 'express';
import { completeSale, getSale, listSales, updateSalePayment } from '../controllers/saleController.js';

const router = Router();

router.get('/', listSales);
router.get('/:id', getSale);
router.patch('/:id', updateSalePayment);
router.post('/', completeSale);

export default router;
