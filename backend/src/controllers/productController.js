import {
  getAllProducts,
  getProductById,
  getServiceProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getLowStockProducts,
} from '../services/productService.js';
import { uploadProductImage, deleteProductImage } from '../services/storageService.js';

async function resolveImageUrl(req) {
  if (req.file) {
    return uploadProductImage(req.file);
  }
  return req.body.image_url || null;
}

export async function listServiceProducts(req, res) {
  try {
    const group = req.params.group;
    if (!['helados', 'copias'].includes(group)) {
      return res.status(400).json({ error: 'Grupo inválido. Use helados o copias' });
    }
    const products = await getServiceProducts(group);
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function listProducts(req, res) {
  try {
    const products = await getAllProducts();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function getProduct(req, res) {
  try {
    const product = await getProductById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function addProduct(req, res) {
  try {
    const { name, description, stock, price } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ error: 'El nombre es obligatorio' });
    }
    if (price === undefined || price === null || Number(price) < 0) {
      return res.status(400).json({ error: 'El precio es obligatorio y debe ser >= 0' });
    }

    const image_url = await resolveImageUrl(req);

    const product = await createProduct({
      name: name.trim(),
      description: description?.trim() || '',
      image_url,
      stock: parseInt(stock, 10) || 0,
      price: parseFloat(price),
    });

    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function editProduct(req, res) {
  try {
    const existing = await getProductById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Producto no encontrado' });

    const { name, description, stock, price, image_url } = req.body;
    const updates = {};

    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description.trim();
    if (stock !== undefined) updates.stock = parseInt(stock, 10);
    if (price !== undefined) updates.price = parseFloat(price);

    if (req.file) {
      updates.image_url = await uploadProductImage(req.file);
      if (existing.image_url) {
        await deleteProductImage(existing.image_url);
      }
    } else if (image_url !== undefined) {
      updates.image_url = image_url || null;
    }

    const product = await updateProduct(req.params.id, updates);
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function removeProduct(req, res) {
  try {
    const existing = await getProductById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Producto no encontrado' });

    const deleted = await deleteProduct(req.params.id);
    if (deleted && existing.image_url) {
      await deleteProductImage(existing.image_url);
    }

    res.json({ message: 'Producto eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function listLowStock(req, res) {
  try {
    const result = await getLowStockProducts();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
