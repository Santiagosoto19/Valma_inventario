import { Router } from 'express';
import {
  listProducts,
  getProduct,
  addProduct,
  editProduct,
  removeProduct,
  listLowStock,
} from '../controllers/productController.js';
import { upload } from '../middleware/upload.js';

const router = Router();

router.get('/', listProducts);
router.get('/low-stock', listLowStock);
router.get('/:id', getProduct);
router.post('/', upload.single('image'), addProduct);
router.put('/:id', upload.single('image'), editProduct);
router.delete('/:id', removeProduct);

export default router;
