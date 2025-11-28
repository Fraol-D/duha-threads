"use client";

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Stage, Layer, Image as KonvaImage, Rect, Text as KonvaText, Group } from 'react-konva';
import type { Stage as KonvaStage } from 'konva/lib/Stage';

import { PLACEMENT_RECTS, type PlacementKey } from '@/config/placementGuides';
import type { CustomPlacementArea, CustomPlacementDesignType, CustomVerticalPosition, TextBoxWidthPreset } from '@/types/custom-order';

const BASE_ASPECT_RATIO = 4 / 3;
const FALLBACK_FONT = 'Inter, system-ui, sans-serif';
export const DEFAULT_FONT_SIZE_CONTROL = 40;
const WIDTH_MULTIPLIERS: Record<TextBoxWidthPreset, number> = {
  narrow: 0.8,
  standard: 1,
  wide: 1.45,
};
const FRONT_BACK_MAX_WIDTH_PERCENT = 42;
const FRONT_BACK_MIN_WIDTH_PERCENT = 16;

export type PreviewCanvasMode = 'full' | 'thumbnail';

export interface CanvasPlacement {
  id: string;
  area: CustomPlacementArea;
  verticalPosition: CustomVerticalPosition;
  designType: CustomPlacementDesignType;
  designText?: string | null;
  designFont?: string | null;
  designColor?: string | null;
  designImageUrl?: string | null;
  fontSize?: number | null;
  textBoxWidth?: TextBoxWidthPreset | null;
}

export interface DesignPreviewCanvasHandle {
  getExportedImage: (pixelRatio?: number) => string | null;
}

interface DesignPreviewCanvasProps {
  baseImageUrl: string;
  placements: CanvasPlacement[];
  width: number;
  height: number;
  mode: PreviewCanvasMode;
  showGuides?: boolean;
  activePlacementId?: string | null;
}

type PlacementRectPixels = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export const DesignPreviewCanvas = forwardRef<DesignPreviewCanvasHandle, DesignPreviewCanvasProps>(function DesignPreviewCanvas(
  { baseImageUrl, placements, width, height, mode, showGuides = false, activePlacementId = null },
  ref,
) {
  const stageRef = useRef<KonvaStage>(null);
  const baseImage = useCanvasImage(baseImageUrl);
  const isDarkBase = baseImageUrl.toLowerCase().includes('black');

  useImperativeHandle(
    ref,
    () => ({
      getExportedImage: (pixelRatio = 2) => getExportedImage(stageRef.current, pixelRatio),
    }),
    [],
  );

  const renderablePlacements = useMemo(() => {
    return placements
      .map((placement) => ({ placement, rect: resolvePlacementRect(placement, width, height) }))
      .filter((entry): entry is { placement: CanvasPlacement; rect: PlacementRectPixels } => Boolean(entry.rect));
  }, [placements, width, height]);

  const backgroundFill = mode === 'thumbnail' ? '#f1f5f9' : '#ffffff';

  if (!width || !height) {
    return <div className="w-full" style={{ paddingBottom: `${BASE_ASPECT_RATIO * 100}%` }} />;
  }

  return (
    <Stage ref={stageRef} width={width} height={height} listening={false} style={{ width: '100%', height: 'auto' }}>
      <Layer listening={false}>
        <Rect x={0} y={0} width={width} height={height} fill={backgroundFill} cornerRadius={16} />
        {baseImage && (
          <KonvaImage image={baseImage} x={0} y={0} width={width} height={height} listening={false} />
        )}
        {renderablePlacements.map(({ placement, rect }) => (
          <PlacementNode
            key={placement.id}
            placement={placement}
            rect={rect}
            showGuides={showGuides}
            isActive={placement.id === activePlacementId}
            isDarkBase={isDarkBase}
            mode={mode}
          />
        ))}
      </Layer>
    </Stage>
  );
});

function PlacementNode({
  placement,
  rect,
  showGuides,
  isActive,
  isDarkBase,
  mode,
}: {
  placement: CanvasPlacement;
  rect: PlacementRectPixels;
  showGuides: boolean;
  isActive: boolean;
  isDarkBase: boolean;
  mode: PreviewCanvasMode;
}) {
  const imageElement = useCanvasImage(placement.designType === 'image' ? placement.designImageUrl || null : null);
  const hasContent = placementHasContent(placement);
  const guideStroke = isDarkBase ? 'rgba(255,255,255,0.85)' : 'rgba(15,23,42,0.75)';
  const activeStroke = isDarkBase ? '#ffffff' : '#0f172a';
  const dashPattern = mode === 'thumbnail' ? [3, 3] : [6, 4];
  const strokeWidth = isActive ? (mode === 'thumbnail' ? 1.2 : 2) : mode === 'thumbnail' ? 0.8 : 1.5;

  return (
    <Group listening={false}>
      {showGuides && (
        <Rect
          x={rect.x}
          y={rect.y}
          width={rect.width}
          height={rect.height}
          cornerRadius={8}
          stroke={isActive ? activeStroke : guideStroke}
          strokeWidth={strokeWidth}
          dash={dashPattern}
          listening={false}
        />
      )}
      {placement.designType === 'image' && imageElement && (
        <KonvaImage image={imageElement} x={rect.x} y={rect.y} width={rect.width} height={rect.height} listening={false} />
      )}
      {placement.designType === 'text' && placement.designText ? (
        <KonvaText
          text={placement.designText}
          x={rect.x}
          y={rect.y}
          width={rect.width}
          height={rect.height}
          align="center"
          verticalAlign="middle"
          fontFamily={placement.designFont || FALLBACK_FONT}
          fontSize={computeFontSize(rect, mode, placement.fontSize)}
          fill={placement.designColor || '#000000'}
          wrap="word"
          lineHeight={1.15}
          ellipsis
          listening={false}
          padding={4}
        />
      ) : null}
      {showGuides && !hasContent && (
        <KonvaText
          text="Placement"
          x={rect.x}
          y={rect.y}
          width={rect.width}
          height={rect.height}
          align="center"
          verticalAlign="middle"
          fontFamily={FALLBACK_FONT}
          fontSize={computeFontSize(rect, mode) * 0.5}
          fill={isDarkBase ? 'rgba(255,255,255,0.85)' : 'rgba(15,23,42,0.65)'}
          listening={false}
        />
      )}
    </Group>
  );
}

function placementHasContent(placement: CanvasPlacement) {
  if (placement.designType === 'text') {
    return Boolean(placement.designText && placement.designText.trim().length > 0);
  }
  if (placement.designType === 'image') {
    return Boolean(placement.designImageUrl);
  }
  return false;
}

function computeFontSize(rect: PlacementRectPixels, mode: PreviewCanvasMode, controlValue?: number | null) {
  const base = Math.min(rect.width, rect.height);
  const scale = mode === 'thumbnail' ? 0.3 : 0.42;
  const requested = controlValue ?? DEFAULT_FONT_SIZE_CONTROL;
  const normalized = Math.max(12, requested);
  const relative = normalized / DEFAULT_FONT_SIZE_CONTROL;
  return Math.max(12, base * scale * relative);
}

function resolvePlacementRect(placement: CanvasPlacement, width: number, height: number): PlacementRectPixels | null {
  const mappedKey = mapAreaToPlacementKey(placement.area);
  const baseRect = PLACEMENT_RECTS[mappedKey];
  if (!baseRect) return null;
  const topPercent = adjustTopPercent(baseRect.topPercent, placement);
  const widthPercent = adjustWidthPercent(baseRect.widthPercent, placement);
  const finalWidth = (widthPercent / 100) * width;
  const finalHeight = (baseRect.heightPercent / 100) * height;
  let x = (baseRect.leftPercent / 100) * width;
  if (baseRect.transform?.includes('translateX(-50%)')) {
    x -= finalWidth / 2;
  }
  const y = (topPercent / 100) * height;
  return { x, y, width: finalWidth, height: finalHeight };
}

function adjustTopPercent(defaultTop: number, placement: CanvasPlacement) {
  if (placement.area !== 'front' && placement.area !== 'back') return defaultTop;
  switch (placement.verticalPosition) {
    case 'upper':
      return 22;
    case 'center':
      return 32;
    default:
      return 42;
  }
}

function adjustWidthPercent(baseWidthPercent: number, placement: CanvasPlacement) {
  if (placement.area !== 'front' && placement.area !== 'back') return baseWidthPercent;
  const preset = placement.textBoxWidth ?? 'standard';
  const multiplier = WIDTH_MULTIPLIERS[preset] ?? 1;
  const adjusted = baseWidthPercent * multiplier;
  return Math.min(FRONT_BACK_MAX_WIDTH_PERCENT, Math.max(FRONT_BACK_MIN_WIDTH_PERCENT, adjusted));
}

function mapAreaToPlacementKey(area: CustomPlacementArea): PlacementKey {
  if (area === 'left_chest') return 'chest_left';
  if (area === 'right_chest') return 'chest_right';
  return area as PlacementKey;
}

function useCanvasImage(src: string | null) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!src) {
      const frame = requestAnimationFrame(() => setImage(null));
      return () => cancelAnimationFrame(frame);
    }
    let isMounted = true;
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.src = src;
    const handleLoad = () => {
      if (isMounted) setImage(img);
    };
    const handleError = () => {
      if (isMounted) setImage(null);
    };
    img.addEventListener('load', handleLoad);
    img.addEventListener('error', handleError);
    return () => {
      isMounted = false;
      img.removeEventListener('load', handleLoad);
      img.removeEventListener('error', handleError);
    };
  }, [src]);
  return image;
}

export function getExportedImage(stage: KonvaStage | null, pixelRatio = 2) {
  if (!stage) return null;
  try {
    return stage.toDataURL({ mimeType: 'image/png', pixelRatio });
  } catch (error) {
    console.error('Failed to export preview', error);
    return null;
  }
}

export const PREVIEW_ASPECT_RATIO = BASE_ASPECT_RATIO;
