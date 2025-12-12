import type { BaseShirtColor } from '@/config/baseShirts';

export type CustomPlacementArea = 'front' | 'back' | 'left_chest' | 'right_chest';
export type CustomPlacementDesignType = 'text' | 'image';
export type CustomVerticalPosition = 'upper' | 'center' | 'lower';
export type TextBoxWidthPreset = 'narrow' | 'standard' | 'wide';

export interface CustomOrderPlacement {
  id?: string | null;
  area?: CustomPlacementArea | 'chest_left' | 'chest_right' | string | null;
  verticalPosition?: CustomVerticalPosition | null;
  designType?: CustomPlacementDesignType | null;
  designText?: string | null;
  designFont?: string | null;
  designFontSize?: number | null;
  textBoxWidth?: TextBoxWidthPreset | null;
  designColor?: string | null;
  designImageUrl?: string | null;
}

export interface CustomOrderSide {
  enabled?: boolean | null;
  placement: 'front' | 'back';
  verticalPosition?: CustomVerticalPosition | null;
  designType?: CustomPlacementDesignType | null;
  designText?: string | null;
  designFont?: string | null;
  designFontSize?: number | null;
  textBoxWidth?: TextBoxWidthPreset | null;
  designColor?: string | null;
  designImageUrl?: string | null;
}

export interface CustomOrderLegacyPlacement {
  placementKey: string;
  label?: string;
}

export interface CustomOrderDesignAsset {
  placementKey: string;
  type: CustomPlacementDesignType;
  text?: string | null;
  font?: string | null;
  fontSize?: number | null;
  textBoxWidth?: TextBoxWidthPreset | null;
  color?: string | null;
  imageUrl?: string | null;
}

export interface CustomOrder {
  id: string;
  orderNumber?: string;
  status?: string;
  baseColor?: BaseShirtColor | string | null;
  baseShirt?: {
    productId?: string | null;
    color?: string | null;
    size?: string | null;
    quantity?: number | null;
  } | null;
  placement?: CustomOrderPlacement['area'];
  verticalPosition?: CustomVerticalPosition | null;
  designType?: CustomPlacementDesignType | null;
  designText?: string | null;
  designFont?: string | null;
  designFontSize?: number | null;
  textBoxWidth?: TextBoxWidthPreset | null;
  designColor?: string | null;
  designImageUrl?: string | null;
  previewImageUrl?: string | null;
  isPublic?: boolean | null;
  publicStatus?: 'private' | 'pending' | 'approved' | 'rejected' | null;
  publicTitle?: string | null;
  publicDescription?: string | null;
  linkedProductId?: string | null;
  quantity?: number | null;
  placements?: CustomOrderPlacement[] | null;
  legacyPlacements?: CustomOrderLegacyPlacement[] | null;
  designAssets?: CustomOrderDesignAsset[] | null;
  sides?: {
    front?: CustomOrderSide;
    back?: CustomOrderSide;
  } | null;
}
