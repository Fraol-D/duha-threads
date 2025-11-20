export const BASE_SHIRTS = {
  black: '/base-shirts/black.png',
  white: '/base-shirts/white.png',
} as const;

export type BaseShirtColor = keyof typeof BASE_SHIRTS; // 'black' | 'white'