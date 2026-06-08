/** Max width (px) of the crop preview sent to the browser. */
export const TITLE_BLOCK_CROP_PREVIEW_MAX_WIDTH_PX = 640;

/** Max binary size (bytes) before base64 encoding. */
export const TITLE_BLOCK_CROP_PREVIEW_MAX_BYTES = 400_000;

export const TITLE_BLOCK_CROP_PREVIEW_JPEG_QUALITY = 82;

export type CropPreviewDimensions = {
  width: number;
  height: number;
  scale: number;
};

export function computeCropPreviewDimensions(
  cropWidth: number,
  cropHeight: number,
  maxWidth = TITLE_BLOCK_CROP_PREVIEW_MAX_WIDTH_PX,
): CropPreviewDimensions {
  if (cropWidth <= maxWidth) {
    return { width: cropWidth, height: cropHeight, scale: 1 };
  }

  const scale = maxWidth / cropWidth;
  const width = Math.max(1, Math.round(cropWidth * scale));
  const height = Math.max(1, Math.round(cropHeight * scale));

  return { width, height, scale };
}

export function isBinaryWithinCropPreviewLimit(
  byteLength: number,
  maxBytes = TITLE_BLOCK_CROP_PREVIEW_MAX_BYTES,
): boolean {
  return byteLength > 0 && byteLength <= maxBytes;
}

export function buildCropPreviewDataUrl(
  mimeType: "image/jpeg" | "image/png",
  base64Payload: string,
): string {
  return `data:${mimeType};base64,${base64Payload}`;
}

export function formatCropPreviewOversizeWarning(
  actualBytes: number,
  maxBytes = TITLE_BLOCK_CROP_PREVIEW_MAX_BYTES,
): string {
  return `El recorte del cajetín (${Math.round(actualBytes / 1024)} KB) supera el límite de preview (${Math.round(maxBytes / 1024)} KB). El OCR sigue disponible, pero no se muestra la imagen.`;
}

export async function encodeTitleBlockCropPreview(
  cropPng: Buffer,
  cropWidth: number,
  cropHeight: number,
): Promise<{ cropImageDataUrl: string | null; previewWarning: string | null }> {
  try {
    const { createCanvas, loadImage } = await import("@napi-rs/canvas");
    const image = await loadImage(cropPng);
    const dimensions = computeCropPreviewDimensions(cropWidth, cropHeight);
    const canvas = createCanvas(dimensions.width, dimensions.height);
    const context = canvas.getContext("2d");

    context.drawImage(image, 0, 0, dimensions.width, dimensions.height);

    const jpegBuffer = canvas.toBuffer(
      "image/jpeg",
      TITLE_BLOCK_CROP_PREVIEW_JPEG_QUALITY,
    );

    if (!isBinaryWithinCropPreviewLimit(jpegBuffer.length)) {
      return {
        cropImageDataUrl: null,
        previewWarning: formatCropPreviewOversizeWarning(jpegBuffer.length),
      };
    }

    return {
      cropImageDataUrl: buildCropPreviewDataUrl(
        "image/jpeg",
        jpegBuffer.toString("base64"),
      ),
      previewWarning: null,
    };
  } catch {
    return {
      cropImageDataUrl: null,
      previewWarning:
        "No se pudo generar la vista previa visual del recorte del cajetín. El OCR sigue disponible.",
    };
  }
}
