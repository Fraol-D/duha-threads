"use client";
import Image from 'next/image';
import { FRONT_BASE_SHIRTS, BACK_BASE_SHIRTS, BASE_SHIRTS, BaseShirtColor } from '@/config/baseShirts';
import { PLACEMENT_RECTS } from '@/config/placementGuides';

type DesignAsset = {
  placementKey: string;
  type: 'image' | 'text';
  sourceType: 'uploaded' | 'template' | 'ai_generated';
  imageUrl?: string;
  text?: string;
  font?: string;
  color?: string;
};

type VerticalPosition = 'upper' | 'center' | 'lower';

interface NewPlacementPreview {
  id: string;
  area: 'front' | 'back' | 'left_chest' | 'right_chest';
  verticalPosition: VerticalPosition;
  designType: 'text' | 'image';
  designText?: string | null;
  designFont?: string | null;
  designColor?: string | null;
  designImageUrl?: string | null;
}

interface Props {
  baseColor: BaseShirtColor;
  assets?: DesignAsset[]; // legacy assets
  mode?: 'front' | 'back';
  placements?: NewPlacementPreview[]; // new placement configs
  overlayPlacementKey?: string;
  overlayType?: 'image' | 'text' | 'placeholder' | null;
  overlayText?: string;
  overlayImageUrl?: string | null;
  overlayColor?: string;
  overlayFont?: string;
  overlayVerticalPosition?: VerticalPosition;
}

export function DesignPreview({ baseColor, assets = [], mode = 'front', placements = [], overlayPlacementKey, overlayType, overlayText, overlayImageUrl, overlayColor, overlayFont, overlayVerticalPosition = 'upper' }: Props) {
  // Determine base image depending on mode (front/back)
  const baseImg = mode === 'front' ? (FRONT_BASE_SHIRTS[baseColor] || BASE_SHIRTS[baseColor]) : (BACK_BASE_SHIRTS[baseColor] || BASE_SHIRTS[baseColor]);
  return (
    <div className="relative w-full max-w-md mx-auto aspect-3/4 select-none">
      <Image
        src={baseImg}
        alt="Base shirt"
        fill
        priority={false}
        sizes="(max-width: 768px) 80vw, 320px"
        className="object-contain"
      />
      <div className="absolute inset-0 pointer-events-none">
        {/* Legacy assets rendering */}
        {assets.map((a, idx) => {
          const baseRect = PLACEMENT_RECTS[a.placementKey as keyof typeof PLACEMENT_RECTS];
          const rect = { ...baseRect };
          // Adjust dynamic vertical position if front/back and asset added through wizard with overlayVerticalPosition
          if ((a.placementKey === 'front' || a.placementKey === 'back') && overlayVerticalPosition) {
            // New realistic vertical tops for front/back
            rect.topPercent = overlayVerticalPosition === 'upper' ? 22 : overlayVerticalPosition === 'center' ? 32 : 42;
          }
          if (!rect) return null;
          const style: React.CSSProperties = {
            top: `${rect.topPercent}%`,
            left: `${rect.leftPercent}%`,
            width: `${rect.widthPercent}%`,
            height: `${rect.heightPercent}%`,
            transform: rect.transform,
          };
          return (
            <div key={idx} className="absolute" style={style}>
              {a.type === 'image' && a.imageUrl ? (
                // Use img for simplicity; could use next/image with fill if URLs are absolute/public
                <img src={a.imageUrl} alt="Design" className="w-full h-full object-contain" loading="lazy" />
              ) : a.type === 'text' && a.text ? (
                <div
                  className="w-full h-full flex items-center justify-center text-center"
                  style={{ color: a.color || '#000', fontFamily: a.font || 'Inter, system-ui, sans-serif' }}
                >
                  <span className="text-[clamp(12px,4vw,28px)] leading-tight px-1 bg-transparent">{a.text}</span>
                </div>
              ) : null}
            </div>
          );
        })}

        {/* New placements rendering based on mode */}
        {placements.filter(p => mode === 'front' ? (p.area === 'front' || p.area === 'left_chest' || p.area === 'right_chest') : p.area === 'back').map(p => {
          // Map area names to existing placement rect keys
          const keyMap: Record<string,string> = {
            left_chest: 'chest_left',
            right_chest: 'chest_right',
          };
          const mappedKey = p.area === 'left_chest' || p.area === 'right_chest' ? keyMap[p.area] : p.area;
          const baseRect = PLACEMENT_RECTS[mappedKey as keyof typeof PLACEMENT_RECTS];
          if (!baseRect) return null;
          const rect = { ...baseRect };
          if ((p.area === 'front' || p.area === 'back') && p.verticalPosition) {
            rect.topPercent = p.verticalPosition === 'upper' ? 22 : p.verticalPosition === 'center' ? 32 : 42;
          }
          const style: React.CSSProperties = {
            top: `${rect.topPercent}%`,
            left: `${rect.leftPercent}%`,
            width: `${rect.widthPercent}%`,
            height: `${rect.heightPercent}%`,
            transform: rect.transform,
          };
          return (
            <div key={p.id} className="absolute" style={style}>
              {p.designType === 'image' && p.designImageUrl ? (
                <img src={p.designImageUrl} alt="Design" className="w-full h-full object-contain" />
              ) : p.designType === 'text' && p.designText ? (
                <div
                  className="w-full h-full flex items-center justify-center text-center"
                  style={{ color: p.designColor || '#000', fontFamily: p.designFont || 'Inter, system-ui, sans-serif' }}
                >
                  <span className="text-[clamp(12px,4vw,28px)] leading-tight px-1 bg-transparent">{p.designText}</span>
                </div>
              ) : null}
            </div>
          );
        })}

        {overlayPlacementKey && (() => {
          const baseRect = PLACEMENT_RECTS[overlayPlacementKey as keyof typeof PLACEMENT_RECTS];
          if (!baseRect) return null;
          const rect = { ...baseRect };
          if ((overlayPlacementKey === 'front' || overlayPlacementKey === 'back') && overlayVerticalPosition) {
            rect.topPercent = overlayVerticalPosition === 'upper' ? 22 : overlayVerticalPosition === 'center' ? 32 : 42;
          }
          if (!rect) return null;
          const style: React.CSSProperties = {
            top: `${rect.topPercent}%`,
            left: `${rect.leftPercent}%`,
            width: `${rect.widthPercent}%`,
            height: `${rect.heightPercent}%`,
            transform: rect.transform,
          };
          // Contrast-aware marker styling
          const isDark = baseColor === 'black';
          if (!overlayType || overlayType === 'placeholder') {
            return (
              <div
                className={`absolute rounded flex items-center justify-center text-[10px] uppercase tracking-wide font-medium ${isDark ? 'border border-white border-dashed bg-white/5 text-white/80 shadow-[0_0_0_1px_rgba(255,255,255,0.3)]' : 'border border-black border-dashed bg-black/5 text-black/70 shadow-[0_0_0_1px_rgba(0,0,0,0.15)]'}`}
                style={style}
              >
                {overlayType === 'placeholder' ? 'Placement' : ''}
              </div>
            );
          }
          if (overlayType === 'image' && overlayImageUrl) {
            return (
              <div className="absolute" style={style}>
                <img src={overlayImageUrl} alt="Design" className="w-full h-full object-contain" />
              </div>
            );
          }
          if (overlayType === 'text' && overlayText) {
            return (
              <div className="absolute" style={style}>
                <div
                  className="w-full h-full flex items-center justify-center text-center"
                  style={{ color: overlayColor || '#000', fontFamily: overlayFont || 'Inter, system-ui, sans-serif' }}
                >
                  <span className="text-[clamp(12px,4vw,28px)] leading-tight px-1 bg-transparent">{overlayText}</span>
                </div>
              </div>
            );
          }
          return null;
        })()}
      </div>
    </div>
  );
}