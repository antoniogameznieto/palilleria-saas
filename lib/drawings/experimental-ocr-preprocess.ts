import {
  DEFAULT_OCR_PREPROCESS_STRATEGY,
  type OcrPreprocessStrategy,
} from "@/lib/drawings/experimental-ocr-preprocess-constants";

const HIGH_CONTRAST_FACTOR = 1.8;
const THRESHOLD_LEVEL = 140;
const UPSCALE_FACTOR = 2;

function rgbToGray(red: number, green: number, blue: number): number {
  return Math.round(red * 0.299 + green * 0.587 + blue * 0.114);
}

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function applyHighContrast(gray: number): number {
  return clampByte((gray - 128) * HIGH_CONTRAST_FACTOR + 128);
}

function applyThreshold(gray: number): number {
  return gray >= THRESHOLD_LEVEL ? 255 : 0;
}

function writeGrayPixel(
  data: Uint8ClampedArray,
  offset: number,
  gray: number,
): void {
  data[offset] = gray;
  data[offset + 1] = gray;
  data[offset + 2] = gray;
}

/**
 * Applies experimental OCR preprocessing to a crop PNG before Tesseract.
 * Preview in UI uses the unprocessed crop; only OCR input is transformed.
 */
export async function applyExperimentalOcrPreprocess(
  pngBuffer: Buffer,
  strategy: OcrPreprocessStrategy = DEFAULT_OCR_PREPROCESS_STRATEGY,
): Promise<Buffer> {
  if (strategy === "original") {
    return pngBuffer;
  }

  const { createCanvas, loadImage } = await import("@napi-rs/canvas");
  const image = await loadImage(pngBuffer);

  const outputWidth =
    strategy === "upscale" ? image.width * UPSCALE_FACTOR : image.width;
  const outputHeight =
    strategy === "upscale" ? image.height * UPSCALE_FACTOR : image.height;

  const canvas = createCanvas(outputWidth, outputHeight);
  const context = canvas.getContext("2d");

  if (strategy === "upscale") {
    context.drawImage(image, 0, 0, outputWidth, outputHeight);
    return canvas.toBuffer("image/png");
  }

  context.drawImage(image, 0, 0, image.width, image.height);
  const imageData = context.getImageData(0, 0, image.width, image.height);
  const { data } = imageData;

  for (let index = 0; index < data.length; index += 4) {
    let gray = rgbToGray(data[index], data[index + 1], data[index + 2]);

    if (strategy === "high-contrast") {
      gray = applyHighContrast(gray);
    }

    if (strategy === "threshold") {
      gray = applyThreshold(rgbToGray(data[index], data[index + 1], data[index + 2]));
    }

    writeGrayPixel(data, index, gray);
  }

  context.putImageData(imageData, 0, 0);

  return canvas.toBuffer("image/png");
}
