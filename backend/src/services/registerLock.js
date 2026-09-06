import { queryWithTimeout } from '../config/database.js';
import { todayLocal } from '../utils/dates.js';

export async function isRegisterLocked() {
  try {
    const { rows } = await queryWithTimeout(
      'SELECT locked FROM cash_closes WHERE business_date = $1',
      [todayLocal()]
    );
    return Boolean(rows[0]?.locked);
  } catch (error) {
    if (error.message?.includes('cash_closes')) return false;
    throw error;
  }
}

export async function assertRegisterUnlocked() {
  if (await isRegisterLocked()) {
    throw new Error('Caja bloqueada. Desbloquéala en Cierre de caja para vender.');
  }
}
