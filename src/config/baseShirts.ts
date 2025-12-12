export const FRONT_BASE_SHIRTS = {
  black: '/base-shirts/black_front.png',
  white: '/base-shirts/white_front.png',
} as const;

export const BACK_BASE_SHIRTS = {
  black: '/base-shirts/black_back.png',
  white: '/base-shirts/white_back.png',
} as const;

// Fallback single image mapping (legacy)
export const BASE_SHIRTS = {
  black: '/base-shirts/black.png',
  white: '/base-shirts/white.png',
} as const;

export type BaseShirtColor = keyof typeof BASE_SHIRTS; // 'black' | 'white'