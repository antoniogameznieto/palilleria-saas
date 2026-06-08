/** Bottom-right title block region (first approximation). */
export const TITLE_BLOCK_WIDTH_RATIO = 0.35;
export const TITLE_BLOCK_HEIGHT_RATIO = 0.25;
export const TITLE_BLOCK_SCREENSHOT_WIDTH_PX = 1400;

export type TitleBlockCropRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function computeTitleBlockCropRect(
  pageWidth: number,
  pageHeight: number,
  widthRatio = TITLE_BLOCK_WIDTH_RATIO,
  heightRatio = TITLE_BLOCK_HEIGHT_RATIO,
): TitleBlockCropRect {
  const width = Math.max(1, Math.floor(pageWidth * widthRatio));
  const height = Math.max(1, Math.floor(pageHeight * heightRatio));

  return {
    x: Math.max(0, pageWidth - width),
    y: Math.max(0, pageHeight - height),
    width,
    height,
  };
}
