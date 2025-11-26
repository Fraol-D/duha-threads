import { CustomOrderDocument } from '@/lib/db/models/CustomOrder';
import { env } from '@/config/env';

type OrderLike = Pick<CustomOrderDocument, '_id' | 'baseShirt' | 'designAssets' | 'placement' | 'verticalPosition'>;

const FRONT_BACK_VERTICAL_TOPS: Record<'upper' | 'center' | 'lower', number> = {
  upper: 22,
  center: 32,
  lower: 42,
};

/**
 * Generate a preview image using Cloudinary's transformation API.
 * No native dependencies required - all compositing happens server-side at Cloudinary.
 */
export async function generateCustomOrderPreview(order: OrderLike): Promise<string | null> {
  try {
    // Ensure Cloudinary is configured
    if (!env.CLOUDINARY_CLOUD_NAME) {
      console.warn('[PREVIEW] Cloudinary not configured, skipping preview generation');
      return null;
    }

    // Get base shirt image path
    const baseColor = order.baseShirt?.color === 'black' ? 'black' : 'white';
    const baseShirtPublicId = `base-shirts/${baseColor}_front`; // Assumes base shirts are uploaded to Cloudinary

    // For now, we'll use Cloudinary's transformation URL to overlay the first design asset
    // This creates a preview without uploading - just a transformation URL
    const asset = order.designAssets?.[0];
    if (!asset) {
      // No assets, just return the base shirt URL
      return buildCloudinaryUrl(baseShirtPublicId, []);
    }

    const transformations: string[] = [];

    // Handle image overlay
    if (asset.type === 'image' && asset.imageUrl) {
      // Extract Cloudinary public ID from URL if it's a Cloudinary URL
      const cloudinaryPattern = /cloudinary\.com\/[^/]+\/image\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/;
      const match = asset.imageUrl.match(cloudinaryPattern);
      
      if (match) {
        const overlayPublicId = match[1];
        // Calculate overlay positioning based on placement
        const positioning = getOverlayPositioning(asset.placementKey, order.verticalPosition);
        transformations.push(
          `l_${overlayPublicId.replace(/\//g, ':')},w_${positioning.width},g_${positioning.gravity},x_${positioning.x},y_${positioning.y}`
        );
      }
    } else if (asset.type === 'text' && asset.text) {
      // Text overlay
      const positioning = getOverlayPositioning(asset.placementKey, order.verticalPosition);
      const color = (asset.color || '#000000').replace('#', 'rgb:');
      const fontFamily = (asset.font && asset.font.split(',')[0]) || 'Arial';
      const fontSize = positioning.fontSize || 48;
      
      transformations.push(
        `l_text:${fontFamily}_${fontSize}:${encodeURIComponent(asset.text)},co_${color},g_${positioning.gravity},x_${positioning.x},y_${positioning.y}`
      );
    }

    // Build the final Cloudinary URL
    const previewUrl = buildCloudinaryUrl(baseShirtPublicId, transformations);
    
    return previewUrl;
  } catch (e) {
    console.warn('[PREVIEW] Preview generation failed', e);
    return null;
  }
}

function buildCloudinaryUrl(publicId: string, transformations: string[]): string {
  const cloudName = env.CLOUDINARY_CLOUD_NAME;
  const transformStr = transformations.length > 0 ? transformations.join(',') + '/' : '';
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformStr}${publicId}`;
}

function getOverlayPositioning(placementKey: string, verticalPosition?: 'upper' | 'center' | 'lower') {
  // Cloudinary uses different positioning - these are approximations
  // Gravity: center, north, south, east, west, north_east, north_west, south_east, south_west
  
  switch (placementKey) {
    case 'front':
      const yOffset = verticalPosition ? FRONT_BACK_VERTICAL_TOPS[verticalPosition] - 32 : 0;
      return {
        gravity: 'center',
        x: 0,
        y: yOffset * 3, // Scale percentage to pixels (rough estimate)
        width: 300,
        fontSize: 64,
      };
    case 'back':
      const yOffsetBack = verticalPosition ? FRONT_BACK_VERTICAL_TOPS[verticalPosition] - 32 : 0;
      return {
        gravity: 'center',
        x: 0,
        y: yOffsetBack * 3,
        width: 300,
        fontSize: 64,
      };
    case 'leftChest':
      return {
        gravity: 'north_west',
        x: 80,
        y: 100,
        width: 120,
        fontSize: 32,
      };
    case 'rightChest':
      return {
        gravity: 'north_east',
        x: 80,
        y: 100,
        width: 120,
        fontSize: 32,
      };
    default:
      return {
        gravity: 'center',
        x: 0,
        y: 0,
        width: 300,
        fontSize: 48,
      };
  }
}
