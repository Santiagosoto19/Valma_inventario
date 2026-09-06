import {
  closeCashClose,
  getTodayCashClose,
  listCashCloses,
  openCashClose,
  setCashCloseLocked,
} from '../services/cashCloseService.js';
import { httpStatusFromError, userFacingError } from '../utils/httpErrors.js';

function statusFromError(error) {
  const msg = error.message || '';
  if (msg.includes('Caja bloqueada') || msg.includes('antes de bloquear')) return 409;
  if (msg.includes('ya está cerrado') || msg.includes('debe ser un número')) return 400;
  return httpStatusFromError(error);
}

export async function getToday(req, res) {
  try {
    res.json(await getTodayCashClose());
  } catch (error) {
    res.status(httpStatusFromError(error)).json({ error: userFacingError(error) });
  }
}

export async function listCloses(req, res) {
  try {
    res.json(await listCashCloses(req.query.limit));
  } catch (error) {
    res.status(httpStatusFromError(error)).json({ error: userFacingError(error) });
  }
}

export async function openClose(req, res) {
  try {
    res.json(await openCashClose(req.body?.opening_float));
  } catch (error) {
    res.status(statusFromError(error)).json({ error: userFacingError(error) });
  }
}

export async function closeToday(req, res) {
  try {
    const { cash_counted, nequi_counted, notes, opening_float } = req.body || {};
    if (cash_counted === undefined || cash_counted === null || cash_counted === '') {
      return res.status(400).json({ error: 'Escribe cuánto efectivo hay en caja' });
    }
    if (nequi_counted === undefined || nequi_counted === null || nequi_counted === '') {
      return res.status(400).json({ error: 'Escribe cuánto hay en Nequi' });
    }
    res.json(await closeCashClose({ cash_counted, nequi_counted, notes, opening_float }));
  } catch (error) {
    res.status(statusFromError(error)).json({ error: userFacingError(error) });
  }
}

export async function lockToday(req, res) {
  try {
    if (typeof req.body?.locked !== 'boolean') {
      return res.status(400).json({ error: 'locked debe ser true o false' });
    }
    res.json(await setCashCloseLocked(req.body.locked));
  } catch (error) {
    res.status(statusFromError(error)).json({ error: userFacingError(error) });
  }
}
