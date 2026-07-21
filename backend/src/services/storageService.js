import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export function isCloudinaryEnabled() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

function extractPublicId(url) {
  if (!url?.includes('cloudinary.com')) return null;
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[^/]+$/);
  return match ? match[1] : null;
}

export async function uploadProductImage(file) {
  if (!file) return null;

  if (isCloudinaryEnabled()) {
    const uploadPromise = new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'valma/products',
          resource_type: 'image',
          timeout: 15_000,
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result.secure_url);
        }
      );
      stream.end(file.buffer);
    });

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('TIMEOUT: subida de imagen tardó demasiado')), 15_000);
    });

    return Promise.race([uploadPromise, timeoutPromise]);
  }

  if (file.filename) {
    return `/uploads/${file.filename}`;
  }

  return null;
}

export async function deleteProductImage(imageUrl) {
  if (!imageUrl || !isCloudinaryEnabled()) return;

  const publicId = extractPublicId(imageUrl);
  if (publicId) {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch {
      // Imagen ya eliminada o no encontrada
    }
  }
}
