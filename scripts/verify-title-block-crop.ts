import {
  TITLE_BLOCK_CROP_PREVIEW_MAX_BYTES,
  TITLE_BLOCK_CROP_PREVIEW_MAX_WIDTH_PX,
  buildCropPreviewDataUrl,
  computeCropPreviewDimensions,
  formatCropPreviewOversizeWarning,
  isBinaryWithinCropPreviewLimit,
} from "../lib/drawings/experimental-title-block-crop-preview";
import { computeTitleBlockCropRect } from "../lib/drawings/experimental-title-block-crop";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function verifyTitleBlockCropRect(): void {
  const rect = computeTitleBlockCropRect(1400, 1000);

  assert(rect.width === Math.floor(1400 * 0.35), "Width should be 35% of page width");
  assert(rect.height === Math.floor(1000 * 0.25), "Height should be 25% of page height");
  assert(rect.x === 1400 - rect.width, "Crop should anchor bottom-right");
  assert(rect.y === 1000 - rect.height, "Crop should anchor bottom-right");

  const small = computeTitleBlockCropRect(10, 10);
  assert(small.width >= 1 && small.height >= 1, "Crop should never be zero-sized");
}

function verifyCropPreviewLimits(): void {
  const scaled = computeCropPreviewDimensions(900, 450);

  assert(
    scaled.width === TITLE_BLOCK_CROP_PREVIEW_MAX_WIDTH_PX,
    "Wide crops should scale down to preview max width",
  );
  assert(scaled.width <= TITLE_BLOCK_CROP_PREVIEW_MAX_WIDTH_PX, "Preview width capped");
  assert(scaled.scale < 1, "Default crop should be scaled down for preview");

  const unchanged = computeCropPreviewDimensions(320, 200);
  assert(unchanged.scale === 1, "Small crops should not scale up");
  assert(unchanged.width === 320, "Small crop width unchanged");

  assert(
    isBinaryWithinCropPreviewLimit(TITLE_BLOCK_CROP_PREVIEW_MAX_BYTES),
    "Limit boundary should be accepted",
  );
  assert(
    !isBinaryWithinCropPreviewLimit(TITLE_BLOCK_CROP_PREVIEW_MAX_BYTES + 1),
    "Over limit should be rejected",
  );

  const dataUrl = buildCropPreviewDataUrl("image/jpeg", "abc123");
  assert(
    dataUrl === "data:image/jpeg;base64,abc123",
    "Data URL should use expected mime prefix",
  );

  const warning = formatCropPreviewOversizeWarning(500_000);
  assert(warning.includes("488 KB"), "Oversize warning should mention actual size");
  assert(warning.includes("OCR"), "Oversize warning should mention OCR still works");
}

verifyTitleBlockCropRect();
verifyCropPreviewLimits();
console.log("verify-title-block-crop: all checks passed");
