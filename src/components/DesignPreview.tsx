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
  builderStep?: string; // 'baseShirt' | 'placements' | 'design' | 'review'
}

export function DesignPreview({ baseColor, assets = [], mode = 'front', placements = [], overlayPlacementKey, overlayType, overlayText, overlayImageUrl, overlayColor, overlayFont, overlayVerticalPosition = 'upper', builderStep }: Props) {
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
                <div className="relative w-full h-full">
                  <Image src={a.imageUrl} alt="Design" fill sizes="(max-width: 768px) 80vw, 320px" className="object-contain" />
                </div>
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
        {(() => {
          const showGuides = builderStep === 'baseShirt' || builderStep === 'placements';
          return placements
            .filter(p => mode === 'front' ? (p.area === 'front' || p.area === 'left_chest' || p.area === 'right_chest') : p.area === 'back')
            .map(p => {
              const keyMap: Record<string,string> = { left_chest: 'chest_left', right_chest: 'chest_right' };
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
              const isActive = overlayPlacementKey === mappedKey;
              const baseBoxClasses = "absolute rounded border border-dashed";
              const faintBox = baseColor === 'black' ? "border-white/40 bg-transparent" : "border-black/30 bg-transparent";
              const activeBox = baseColor === 'black' ? "border-white bg-white/5 shadow-[0_0_0_1px_rgba(255,255,255,0.4)]" : "border-black bg-black/5 shadow-[0_0_0_1px_rgba(0,0,0,0.2)]";
              return (
                <div key={p.id} className="absolute" style={style}>
                  {showGuides && (
                    <div className={`${baseBoxClasses} ${isActive ? activeBox : faintBox} w-full h-full pointer-events-none`} />
                  )}
                  {p.designType === 'image' && p.designImageUrl ? (
                    <div className="absolute inset-0">
                      <Image src={p.designImageUrl} alt="Design" fill sizes="(max-width: 768px) 80vw, 320px" className="object-contain" />
                    </div>
                  ) : p.designType === 'text' && p.designText ? (
                    <div
                      className="absolute inset-0 flex items-center justify-center text-center"
                      style={{ color: p.designColor || '#000', fontFamily: p.designFont || 'Inter, system-ui, sans-serif' }}
                    >
                      <span className="text-[clamp(12px,4vw,28px)] leading-tight px-1 bg-transparent">{p.designText}</span>
                    </div>
                  ) : null}
                </div>
              );
            });
        })()}

        {overlayPlacementKey && (() => {
          const showGuides = builderStep === 'baseShirt' || builderStep === 'placements';
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
          // Determine if corresponding placement already has content; if so, suppress placeholder.
          const mappedKey = overlayPlacementKey === 'chest_left' ? 'left_chest' : overlayPlacementKey === 'chest_right' ? 'right_chest' : overlayPlacementKey;
          const existingPlacement = placements.find(p => p.area === mappedKey);
          const hasContent = existingPlacement && (
            (existingPlacement.designType === 'text' && existingPlacement.designText && existingPlacement.designText.trim().length > 0) ||
            (existingPlacement.designType === 'image' && existingPlacement.designImageUrl)
          );
          if (showGuides && (!overlayType || overlayType === 'placeholder') && !hasContent) {
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
                <div className="relative w-full h-full">
                  <Image src={overlayImageUrl} alt="Design" fill sizes="(max-width: 768px) 80vw, 320px" className="object-contain" />
                </div>
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