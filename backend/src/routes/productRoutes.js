import { Router } from 'express';
import {
  listProducts,
  listServiceProducts,
  getProduct,
  getByBarcode,
  addProduct,
  editProduct,
  removeProduct,
  listLowStock,
} from '../controllers/productController.js';
import { upload } from '../middleware/upload.js';

const router = Router();

router.get('/', listProducts);
router.get('/by-barcode/:code', getByBarcode);
router.get('/services/:group', listServiceProducts);
router.get('/low-stock', listLowStock);
router.get('/:id', getProduct);
router.post('/', upload.single('image'), addProduct);
router.put('/:id', upload.single('image'), editProduct);
router.delete('/:id', removeProduct);

export default router;
