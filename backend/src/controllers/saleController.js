import { createSale, getSaleById, getSales } from '../services/saleService.js';
import { httpStatusFromError } from '../utils/httpErrors.js';

export async function completeSale(req, res) {
  try {
    const { items, payment_method, global_discount } = req.body;
    const sale = await createSale({ items, payment_method, global_discount });
    res.status(201).json(sale);
  } catch (error) {
    const status = error.message.includes('Stock insuficiente') ||
      error.message.includes('no encontrado') ||
      error.message.includes('inválid')
      ? 400
      : httpStatusFromError(error);
    res.status(status).json({ error: error.message });
  }
}

export async function getSale(req, res) {
  try {
    const sale = await getSaleById(req.params.id);
    if (!sale) return res.status(404).json({ error: 'Venta no encontrada' });
    res.json(sale);
  } catch (error) {
    res.status(httpStatusFromError(error)).json({ error: error.message });
  }
}

export async function listSales(req, res) {
  try {
    const sales = await getSales({
      date: req.query.date,
      month: req.query.month,
      year: req.query.year,
    });
    res.json(sales);
  } catch (error) {
    res.status(httpStatusFromError(error)).json({ error: error.message });
  }
}
