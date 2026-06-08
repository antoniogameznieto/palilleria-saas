import {
  TITLE_BLOCK_CROP_PREVIEW_MAX_BYTES,
  TITLE_BLOCK_CROP_PREVIEW_MAX_WIDTH_PX,
  buildCropPreviewDataUrl,
  computeCropPreviewDimensions,
  formatCropPreviewOversizeWarning,
  isBinaryWithinCropPreviewLimit,
} from "../lib/drawings/experimental-title-block-crop-preview";
import {
  DEFAULT_TITLE_BLOCK_CROP_PERCENTS,
  TITLE_BLOCK_CROP_PRESETS,
  formatTitleBlockCropZoneLabel,
  validateTitleBlockCropPercents,
} from "../lib/drawings/experimental-title-block-crop-params";
import {
  computeTitleBlockCropRect,
  computeTitleBlockCropRectFromPercents,
} from "../lib/drawings/experimental-title-block-crop";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function verifyTitleBlockCropRect(): void {
  const rect = computeTitleBlockCropRect(1400, 1000);
  const expectedWidth = Math.floor((1400 * 35) / 100);
  const expectedHeight = Math.floor((1000 * 25) / 100);
  const expectedX = Math.floor((1400 * 65) / 100);
  const expectedY = Math.floor((1000 * 75) / 100);

  assert(rect.width === expectedWidth, "Width should be 35% of page width");
  assert(rect.height === expectedHeight, "Height should be 25% of page height");
  assert(rect.x === expectedX, "Crop X should match default xPercent");
  assert(rect.y === expectedY, "Crop Y should match default yPercent");

  const small = computeTitleBlockCropRect(10, 10);
  assert(small.width >= 1 && small.height >= 1, "Crop should never be zero-sized");

  const fromPercents = computeTitleBlockCropRectFromPercents(
    1400,
    1000,
    DEFAULT_TITLE_BLOCK_CROP_PERCENTS,
  );
  assert(
    fromPercents.x === rect.x &&
      fromPercents.y === rect.y &&
      fromPercents.width === rect.width &&
      fromPercents.height === rect.height,
    "Percent-based default should match legacy bottom-right crop",
  );
}

function verifyTitleBlockCropValidation(): void {
  assert(
    validateTitleBlockCropPercents(DEFAULT_TITLE_BLOCK_CROP_PERCENTS) === null,
    "Default percents should be valid",
  );

  assert(
    validateTitleBlockCropPercents({
      xPercent: -1,
      yPercent: 75,
      widthPercent: 35,
      heightPercent: 25,
    }) != null,
    "Negative X should fail",
  );

  assert(
    validateTitleBlockCropPercents({
      xPercent: 96,
      yPercent: 75,
      widthPercent: 35,
      heightPercent: 25,
    }) != null,
    "X above 95 should fail",
  );

  assert(
    validateTitleBlockCropPercents({
      xPercent: 65,
      yPercent: 75,
      widthPercent: 4,
      heightPercent: 25,
    }) != null,
    "Width below 5 should fail",
  );

  assert(
    validateTitleBlockCropPercents({
      xPercent: 70,
      yPercent: 75,
      widthPercent: 35,
      heightPercent: 25,
    }) != null,
    "X + width above 100 should fail",
  );

  assert(
    validateTitleBlockCropPercents({
      xPercent: 65,
      yPercent: 80,
      widthPercent: 35,
      heightPercent: 25,
    }) != null,
    "Y + height above 100 should fail",
  );
}

function verifyTitleBlockCropPresets(): void {
  assert(TITLE_BLOCK_CROP_PRESETS.length === 5, "Expected five crop presets");

  for (const preset of TITLE_BLOCK_CROP_PRESETS) {
    assert(
      validateTitleBlockCropPercents(preset.params) === null,
      `Preset ${preset.id} should be valid`,
    );
  }

  const bottomLeft = TITLE_BLOCK_CROP_PRESETS.find(
    (preset) => preset.id === "bottom-left",
  );

  if (!bottomLeft) {
    throw new Error("Bottom-left preset should exist");
  }

  const bottomLeftRect = computeTitleBlockCropRectFromPercents(
    1000,
    800,
    bottomLeft.params,
  );
  assert(bottomLeftRect.x === 0, "Bottom-left preset should start at x=0");
  assert(
    bottomLeftRect.y === Math.floor(800 * 0.75),
    "Bottom-left preset should anchor to bottom",
  );

  const zoneLabel = formatTitleBlockCropZoneLabel(DEFAULT_TITLE_BLOCK_CROP_PERCENTS);
  assert(
    zoneLabel === "Zona: X 65%, Y 75%, ancho 35%, alto 25%",
    "Zone label should use expected format",
  );
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
verifyTitleBlockCropValidation();
verifyTitleBlockCropPresets();
verifyCropPreviewLimits();
console.log("verify-title-block-crop: all checks passed");
