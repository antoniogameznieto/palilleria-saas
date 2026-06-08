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

verifyTitleBlockCropRect();
console.log("verify-title-block-crop: all checks passed");
