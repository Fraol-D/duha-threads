import { CustomOrderDocument } from '@/lib/db/models/CustomOrder';
import { env } from '@/config/env';

type OrderLike = Pick<CustomOrderDocument, '_id' | 'baseShirt' | 'designAssets' | 'placement' | 'verticalPosition'>;

const FRONT_BACK_VERTICAL_TOPS: Record<'upper' | 'center' | 'lower', number> = {
  upper: 22,
  center: 32,
  lower: 42,
};

const TEXT_BOX_WIDTH_MULTIPLIERS: Record<'narrow' | 'standard' | 'wide', number> = {
  narrow: 0.75,
  standard: 1,
  wide: 1.35,
};

const clampFontSize = (size: number | undefined) => {
  if (!size || Number.isNaN(size)) return 48;
  return Math.max(12, Math.min(120, Math.round(size)));
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
      const fontFamily = normalizeCloudinaryFontFamily(asset.font);
      const fontSize = clampFontSize(asset.fontSize ?? positioning.fontSize);
      const widthMultiplier = asset.textBoxWidth ? TEXT_BOX_WIDTH_MULTIPLIERS[asset.textBoxWidth] || 1 : 1;
      const widthDirective = positioning.width ? Math.round(positioning.width * widthMultiplier) : undefined;
      const fitSegment = widthDirective ? `,c_fit,w_${widthDirective}` : '';
      
      transformations.push(
        `l_text:${fontFamily}_${fontSize}:${encodeURIComponent(asset.text)}${fitSegment},co_${color},g_${positioning.gravity},x_${positioning.x},y_${positioning.y}`
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
  const normalized = (placementKey || '').toLowerCase();
  switch (normalized) {
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
    case 'left_chest':
    case 'chest_left':
      return {
        gravity: 'north_west',
        x: 80,
        y: 100,
        width: 120,
        fontSize: 32,
      };
    case 'right_chest':
    case 'chest_right':
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

function normalizeCloudinaryFontFamily(font?: string | null) {
  if (!font) return 'Arial';
  const firstFamily = font.split(',')[0] || 'Arial';
  return firstFamily.replace(/["']/g, '').trim() || 'Arial';
}
