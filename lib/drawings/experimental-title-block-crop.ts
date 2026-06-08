import {
  DEFAULT_TITLE_BLOCK_CROP_PERCENTS,
  type TitleBlockCropPercents,
} from "@/lib/drawings/experimental-title-block-crop-params";

/** @deprecated Use percent-based defaults; kept for reference. */
export const TITLE_BLOCK_WIDTH_RATIO = 0.35;
/** @deprecated Use percent-based defaults; kept for reference. */
export const TITLE_BLOCK_HEIGHT_RATIO = 0.25;
export const TITLE_BLOCK_SCREENSHOT_WIDTH_PX = 1400;

export type TitleBlockCropRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function computeTitleBlockCropRectFromPercents(
  pageWidth: number,
  pageHeight: number,
  percents: TitleBlockCropPercents,
): TitleBlockCropRect {
  const width = Math.max(1, Math.floor((pageWidth * percents.widthPercent) / 100));
  const height = Math.max(
    1,
    Math.floor((pageHeight * percents.heightPercent) / 100),
  );
  const x = Math.max(
    0,
    Math.min(pageWidth - width, Math.floor((pageWidth * percents.xPercent) / 100)),
  );
  const y = Math.max(
    0,
    Math.min(pageHeight - height, Math.floor((pageHeight * percents.yPercent) / 100)),
  );

  return { x, y, width, height };
}

/** Bottom-right title block region (default experimental ROI). */
export function computeTitleBlockCropRect(
  pageWidth: number,
  pageHeight: number,
): TitleBlockCropRect {
  return computeTitleBlockCropRectFromPercents(
    pageWidth,
    pageHeight,
    DEFAULT_TITLE_BLOCK_CROP_PERCENTS,
  );
}
