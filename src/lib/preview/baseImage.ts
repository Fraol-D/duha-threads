import { FRONT_BASE_SHIRTS, BACK_BASE_SHIRTS, BASE_SHIRTS, type BaseShirtColor } from '@/config/baseShirts';

export type PreviewSide = 'front' | 'back';

export function resolveBasePreviewImage(color: BaseShirtColor, side: PreviewSide) {
  const fallback = BASE_SHIRTS[color];
  if (side === 'front') {
    return FRONT_BASE_SHIRTS[color] || fallback;
  }
  return BACK_BASE_SHIRTS[color] || fallback;
}
