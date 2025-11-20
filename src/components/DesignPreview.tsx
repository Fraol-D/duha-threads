"use client";
import Image from 'next/image';
import { BASE_SHIRTS, BaseShirtColor } from '@/config/baseShirts';
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

interface Props {
  baseColor: BaseShirtColor;
  assets?: DesignAsset[];
  overlayPlacementKey?: string; // live placement highlight or in-progress design
  overlayType?: 'image' | 'text' | 'placeholder' | null; // placeholder added for step 2 highlight
  overlayText?: string;
  overlayImageUrl?: string | null;
  overlayColor?: string;
  overlayFont?: string;
  overlayVerticalPosition?: VerticalPosition; // for front/back variant vertical adjustment
}

export function DesignPreview({ baseColor, assets = [], overlayPlacementKey, overlayType, overlayText, overlayImageUrl, overlayColor, overlayFont, overlayVerticalPosition = 'upper' }: Props) {
  return (
    <div className="relative w-full max-w-md mx-auto aspect-3/4 select-none">
      <Image
        src={BASE_SHIRTS[baseColor]}
        alt="Base shirt"
        fill
        priority={false}
        sizes="(max-width: 768px) 80vw, 320px"
        className="object-contain"
      />
      <div className="absolute inset-0 pointer-events-none">
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