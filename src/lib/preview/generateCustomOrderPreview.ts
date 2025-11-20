import path from 'path';
import { promises as fs } from 'fs';
import { CustomOrderDocument } from '@/lib/db/models/CustomOrder';
import { BASE_SHIRTS } from '@/config/baseShirts';
import { PLACEMENT_RECTS } from '@/config/placementGuides';

type OrderLike = Pick<CustomOrderDocument, '_id' | 'baseShirt' | 'designAssets' | 'placement' | 'verticalPosition'>;

const FRONT_BACK_VERTICAL_TOPS: Record<'upper'|'center'|'lower', number> = {
  upper: 22,
  center: 32,
  lower: 42,
};

export async function generateCustomOrderPreview(order: OrderLike): Promise<string | null> {
  try {
    // Lazily load 'canvas' to avoid build-time resolution issues and allow fallback
    let createCanvas: any, loadImage: any;
    try {
      // Use eval to prevent webpack static analysis from bundling 'require("canvas")'
      // eslint-disable-next-line no-eval
      const req: any = eval('require');
      const canvasLib = req('canvas');
      createCanvas = canvasLib.createCanvas;
      loadImage = canvasLib.loadImage;
    } catch (e) {
      // If canvas isn't available (e.g., missing native deps), skip preview generation gracefully
      return null;
    }

    const width = 800; // 3:4 ratio
    const height = Math.round((4/3) * width);
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Load base shirt image
    const baseColor = order.baseShirt?.color === 'black' ? 'black' : 'white';
    const baseRel = BASE_SHIRTS[baseColor];
    const basePath = path.join(process.cwd(), 'public', baseRel.replace(/^\//, ''));
    const baseImg = await loadImage(basePath);
    // Fit contain
    drawContain(ctx, baseImg, width, height);

    // Determine primary design asset (first one)
    const asset = order.designAssets?.[0];
    if (asset) {
      const rectBase = PLACEMENT_RECTS[asset.placementKey as keyof typeof PLACEMENT_RECTS];
      if (rectBase) {
        const rect = { ...rectBase };
        if ((asset.placementKey === 'front' || asset.placementKey === 'back') && order.verticalPosition) {
          rect.topPercent = FRONT_BACK_VERTICAL_TOPS[order.verticalPosition];
        }
        const px = pctToPx(rect, width, height);
        if (asset.type === 'image' && asset.imageUrl) {
          const imgPath = asset.imageUrl.startsWith('/') ? path.join(process.cwd(), 'public', asset.imageUrl) : asset.imageUrl;
          try {
            const img = await loadImage(imgPath);
            ctx.drawImage(img, px.left, px.top, px.width, px.height);
          } catch {}
        } else if (asset.type === 'text' && asset.text) {
          ctx.fillStyle = asset.color || '#000000';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const fontFamily = (asset.font && asset.font.split(',')[0]) || 'Arial';
          // Rough font size heuristic to fit height
          const fontSize = Math.max(16, Math.min(px.height, px.width) * 0.35);
          ctx.font = `${Math.round(fontSize)}px ${fontFamily}`;
          wrapAndFillText(ctx, asset.text, px.left + px.width/2, px.top + px.height/2, px.width * 0.9, Math.round(fontSize * 1.2));
        }
      }
    }

    const outDir = path.join(process.cwd(), 'public', 'previews', 'custom-orders');
    await fs.mkdir(outDir, { recursive: true });
    const outPath = path.join(outDir, `${order._id.toString()}.png`);
    await fs.writeFile(outPath, canvas.toBuffer('image/png'));
    const publicUrl = `/previews/custom-orders/${order._id.toString()}.png`;
    return publicUrl;
  } catch (e) {
    console.warn('Preview generation failed', e);
    return null;
  }
}

function drawContain(ctx: any, img: any, width: number, height: number) {
  const ratio = Math.min(width / img.width, height / img.height);
  const w = img.width * ratio;
  const h = img.height * ratio;
  const x = (width - w) / 2;
  const y = (height - h) / 2;
  ctx.drawImage(img, x, y, w, h);
}

function pctToPx(rect: { topPercent: number; leftPercent: number; widthPercent: number; heightPercent: number; transform?: string }, width: number, height: number) {
  // Base leftPercent as center when transform translateX(-50%) is used
  let left = (rect.leftPercent / 100) * width;
  if (rect.transform && rect.transform.includes('translateX(-50%)')) {
    left = left - ((rect.widthPercent / 100) * width) / 2;
  }
  const top = (rect.topPercent / 100) * height;
  const w = (rect.widthPercent / 100) * width;
  const h = (rect.heightPercent / 100) * height;
  return { left, top, width: w, height: h };
}

function wrapAndFillText(ctx: any, text: string, cx: number, cy: number, maxWidth: number, lineHeight: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const w of words) {
    const test = current ? current + ' ' + w : w;
    const metrics = ctx.measureText(test);
    if (metrics.width > maxWidth && current) {
      lines.push(current);
      current = w;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  const totalHeight = lineHeight * lines.length;
  let y = cy - totalHeight / 2 + lineHeight / 2;
  for (const line of lines) {
    ctx.fillText(line, cx, y);
    y += lineHeight;
  }
}
