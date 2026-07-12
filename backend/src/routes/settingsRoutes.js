import { Router } from 'express';
import { getSettings, patchSettings } from '../controllers/settingsController.js';

const router = Router();

router.get('/', getSettings);
router.patch('/', patchSettings);

export default router;
