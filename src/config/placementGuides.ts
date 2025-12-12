export type PlacementKey = 'front' | 'back' | 'chest' | 'chest_left' | 'chest_right' | 'sleeve_left' | 'sleeve_right';

export interface PlacementRect {
  topPercent: number;
  leftPercent: number;
  widthPercent: number;
  heightPercent: number;
  transform?: string;
}

// Default approximate print regions for a standard tee mockup in a 3:4 aspect container.
export const PLACEMENT_RECTS: Record<PlacementKey, PlacementRect> = {
  // Base rect for front/back will have its topPercent dynamically adjusted by vertical position in the preview component
  // Reduced realistic print zone (~50% smaller) for front/back; topPercent dynamically overridden
  front: { topPercent: 32, leftPercent: 50, widthPercent: 22, heightPercent: 30, transform: 'translateX(-50%)' },
  back: { topPercent: 32, leftPercent: 50, widthPercent: 22, heightPercent: 30, transform: 'translateX(-50%)' },
  chest: { topPercent: 18, leftPercent: 60, widthPercent: 22, heightPercent: 16 },
  // Adjusted chest placements to sit clearly within torso (no sleeve overlap)
  chest_left: { topPercent: 28, leftPercent: 38, widthPercent: 18, heightPercent: 16, transform: 'translateX(-50%)' },
  chest_right: { topPercent: 28, leftPercent: 62, widthPercent: 18, heightPercent: 16, transform: 'translateX(-50%)' },
  sleeve_left: { topPercent: 12, leftPercent: 8, widthPercent: 18, heightPercent: 14 },
  sleeve_right: { topPercent: 12, leftPercent: 74, widthPercent: 18, heightPercent: 14 },
};