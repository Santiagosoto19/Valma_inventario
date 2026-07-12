import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { isCloudinaryEnabled } from '../services/storageService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.resolve(__dirname, '../../', process.env.UPLOAD_DIR || 'uploads');

const fileFilter = (_req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp/;
  const ext = allowed.test(path.extname(file.originalname).toLowerCase());
  const mime = allowed.test(file.mimetype);
  if (ext && mime) cb(null, true);
  else cb(new Error('Solo se permiten imágenes (jpeg, png, gif, webp)'));
};

function createStorage() {
  if (isCloudinaryEnabled()) {
    return multer.memoryStorage();
  }

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${unique}${path.extname(file.originalname)}`);
    },
  });
}

export const upload = multer({
  storage: createStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
});

export { uploadDir };
