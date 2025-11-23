import { v2 as cloudinary } from 'cloudinary';
import { env } from '@/config/env';

// Configure Cloudinary (runs server-side only)
cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

export default cloudinary;

export async function uploadBufferToCloudinary(buffer: Buffer, folder: string, filenameHint?: string) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder, resource_type: 'image', public_id: filenameHint }, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
    stream.end(buffer);
  });
}
