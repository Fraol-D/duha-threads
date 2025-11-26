"use client";

import { DesignPreviewCanvas, type CanvasPlacement, PREVIEW_ASPECT_RATIO, type PreviewCanvasMode } from '@/components/preview/DesignPreviewCanvas';
import type { BaseShirtColor } from '@/config/baseShirts';
import type {
  CustomOrder,
  CustomOrderPlacement,
  CustomOrderLegacyPlacement,
  CustomOrderDesignAsset,
  CustomPlacementArea,
  CustomPlacementDesignType,
  CustomVerticalPosition,
} from '@/types/custom-order';
import { resolveBasePreviewImage } from '@/lib/preview/baseImage';

export type CustomOrderPreviewSize = 'sm' | 'md' | 'lg';
export type PreviewVariant = 'builder' | 'detail' | 'thumbnail';

type PreviewPlacement = CanvasPlacement;

const DEFAULT_VERTICAL: CustomVerticalPosition = 'upper';
const FALLBACK_FONT = 'Inter, system-ui, sans-serif';

type LayoutConfig = {
  wrapper: string;
  panelClass: string;
  labelClass: string;
  hideLabels: boolean;
  canvasWidth: number;
  canvasMode: PreviewCanvasMode;
};

type PanelEntry = {
  label: string | null;
  side: 'front' | 'back';
  visible?: boolean;
};

const VARIANT_LAYOUTS: Record<PreviewVariant, LayoutConfig> = {
  builder: {
    wrapper: 'flex flex-wrap gap-6',
    panelClass: 'w-full max-w-[340px]',
    labelClass: 'text-xs uppercase tracking-wide text-muted-foreground',
    hideLabels: true,
    canvasWidth: 320,
    canvasMode: 'full',
  },
  detail: {
    wrapper: 'flex flex-wrap gap-6',
    panelClass: 'w-full max-w-[320px]',
    labelClass: 'text-xs uppercase tracking-wide text-muted-foreground',
    hideLabels: false,
    canvasWidth: 300,
    canvasMode: 'full',
  },
  thumbnail: {
    wrapper: 'flex justify-center',
    panelClass: 'w-full max-w-[180px]',
    labelClass: 'text-[10px] uppercase tracking-widest text-muted-foreground',
    hideLabels: true,
    canvasWidth: 140,
    canvasMode: 'thumbnail',
  },
};

export function CustomOrderPreview({
  order,
  size = 'md',
  variant,
}: {
  order: CustomOrder;
  size?: CustomOrderPreviewSize;
  variant?: PreviewVariant;
}) {
  const resolvedVariant: PreviewVariant = variant || (size === 'sm' ? 'thumbnail' : size === 'lg' ? 'builder' : 'detail');
  const baseColor = normalizeBaseColor(order);
  const placements = extractPlacements(order);
  const frontPlacements = placements.filter((entry) => entry.area !== 'back');
  const backPlacements = placements.filter((entry) => entry.area === 'back');
  const hasBackContent = backPlacements.length > 0;
  const hasFrontContent = frontPlacements.length > 0;
  const layout = getLayout(resolvedVariant);
  const panelHeight = layout.canvasWidth * PREVIEW_ASPECT_RATIO;

  const panels: PanelEntry[] =
    resolvedVariant === 'thumbnail'
      ? [
          {
            label: layout.hideLabels ? null : 'Front',
            side: hasFrontContent || !hasBackContent ? 'front' : 'back',
          },
        ]
      : [
          { label: 'Front', side: 'front', visible: hasFrontContent || !hasBackContent },
          { label: 'Back', side: 'back', visible: hasBackContent },
        ];

  return (
    <div className={layout.wrapper}>
      {panels.map((panel) => {
        if (panel.visible === false) return null;
        const panelPlacements = panel.side === 'back' ? backPlacements : frontPlacements;
        const baseImageUrl = resolveBasePreviewImage(baseColor, panel.side);
        return (
          <div key={panel.side} className="flex flex-col items-center gap-1">
            {panel.label && !layout.hideLabels && <span className={layout.labelClass}>{panel.label}</span>}
            <div className={`${layout.panelClass} mx-auto`} style={{ width: '100%', maxWidth: `${layout.canvasWidth}px` }}>
              <DesignPreviewCanvas
                baseImageUrl={baseImageUrl}
                placements={panelPlacements}
                width={layout.canvasWidth}
                height={panelHeight}
                mode={layout.canvasMode}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function getLayout(variant: PreviewVariant): LayoutConfig {
  return VARIANT_LAYOUTS[variant] || VARIANT_LAYOUTS.detail;
}

function normalizeBaseColor(order: CustomOrder): BaseShirtColor {
  const raw = order.baseColor || order.baseShirt?.color || 'white';
  return raw && raw.toLowerCase() === 'black' ? 'black' : 'white';
}

function extractPlacements(order: CustomOrder): PreviewPlacement[] {
  const explicit =
    Array.isArray(order.placements) && order.placements.length > 0
      ? order.placements
          .map((placement, index) => normalizePlacement(placement, `placement-${placement.id ?? index}`))
          .filter((placement): placement is PreviewPlacement => Boolean(placement))
      : [];
  if (explicit.length > 0) return explicit;

  const fromSides = placementsFromSides(order);
  if (fromSides.length > 0) return fromSides;

  const fromLegacy = placementsFromLegacy(order.legacyPlacements || [], order.designAssets || [], order);
  if (fromLegacy.length > 0) return fromLegacy;

  const fallback = placementFromFlatFields(order);
  return fallback ? [fallback] : [];
}

function normalizePlacement(placement: CustomOrderPlacement, fallbackId: string): PreviewPlacement | null {
  const area = normalizeArea(placement.area);
  const designType: CustomPlacementDesignType =
    (placement.designType as CustomPlacementDesignType | undefined) || (placement.designImageUrl ? 'image' : 'text');
  return {
    id: placement.id?.toString() || fallbackId,
    area,
    verticalPosition: placement.verticalPosition || DEFAULT_VERTICAL,
    designType,
    designText: designType === 'text' ? placement.designText || '' : null,
    designFont: designType === 'text' ? placement.designFont || FALLBACK_FONT : null,
    designColor: designType === 'text' ? placement.designColor || '#000000' : null,
    designImageUrl: designType === 'image' ? placement.designImageUrl || null : null,
  };
}

function placementsFromSides(order: CustomOrder): PreviewPlacement[] {
  if (!order.sides) return [];
  const entries: PreviewPlacement[] = [];
  (['front', 'back'] as const).forEach((key) => {
    const side = order.sides?.[key];
    if (!side || side.enabled === false) return;
    const designType: CustomPlacementDesignType =
      (side.designType as CustomPlacementDesignType | undefined) || (side.designImageUrl ? 'image' : 'text');
    entries.push({
      id: `${key}-side`,
      area: key,
      verticalPosition: side.verticalPosition || DEFAULT_VERTICAL,
      designType,
      designText: designType === 'text' ? side.designText || order.designText || '' : null,
      designFont: designType === 'text' ? side.designFont || order.designFont || FALLBACK_FONT : null,
      designColor: designType === 'text' ? side.designColor || order.designColor || '#000000' : null,
      designImageUrl: designType === 'image' ? side.designImageUrl || order.designImageUrl || null : null,
    });
  });
  return entries;
}

function placementsFromLegacy(
  legacyPlacements: CustomOrderLegacyPlacement[],
  designAssets: CustomOrderDesignAsset[],
  order: CustomOrder,
): PreviewPlacement[] {
  if (!legacyPlacements.length && !designAssets.length) return [];
  const assetsByPlacement = new Map<string, CustomOrderDesignAsset>();
  designAssets.forEach((asset) => {
    if (asset.placementKey && !assetsByPlacement.has(asset.placementKey)) {
      assetsByPlacement.set(asset.placementKey, asset);
    }
  });

  const orderedKeys: string[] = [];
  legacyPlacements.forEach((placement) => {
    if (placement.placementKey) orderedKeys.push(placement.placementKey);
  });
  assetsByPlacement.forEach((_, key) => {
    if (!orderedKeys.includes(key)) orderedKeys.push(key);
  });

  return orderedKeys.map((key, index) => {
    const asset = assetsByPlacement.get(key);
    const placementKey = normalizeArea(key);
    const designType: CustomPlacementDesignType =
      (asset?.type as CustomPlacementDesignType | undefined) ||
      order.designType ||
      (order.designImageUrl ? 'image' : 'text') ||
      'text';
    return {
      id: `legacy-${key || index}`,
      area: placementKey,
      verticalPosition: DEFAULT_VERTICAL,
      designType,
      designText: designType === 'text' ? asset?.text || order.designText || '' : null,
      designFont: designType === 'text' ? asset?.font || order.designFont || FALLBACK_FONT : null,
      designColor: designType === 'text' ? asset?.color || order.designColor || '#000000' : null,
      designImageUrl: designType === 'image' ? asset?.imageUrl || order.designImageUrl || null : null,
    };
  });
}

function placementFromFlatFields(order: CustomOrder): PreviewPlacement | null {
  const area = normalizeArea(order.placement || order.legacyPlacements?.[0]?.placementKey);
  const derivedType: CustomPlacementDesignType | undefined =
    order.designType || (order.designImageUrl ? 'image' : undefined);
  const designType: CustomPlacementDesignType = derivedType || 'text';
  return {
    id: 'flat-fallback',
    area,
    verticalPosition: order.verticalPosition || DEFAULT_VERTICAL,
    designType,
    designText: designType === 'text' ? order.designText || '' : null,
    designFont: designType === 'text' ? order.designFont || FALLBACK_FONT : null,
    designColor: designType === 'text' ? order.designColor || '#000000' : null,
    designImageUrl: designType === 'image' ? order.designImageUrl || null : null,
  };
}

function normalizeArea(area?: CustomOrderPlacement['area'] | string | null): CustomPlacementArea {
  const value = (area || 'front').toString().toLowerCase();
  if (value.includes('back')) return 'back';
  if (value.includes('right')) return 'right_chest';
  if (value.includes('left')) return 'left_chest';
  return 'front';
}
