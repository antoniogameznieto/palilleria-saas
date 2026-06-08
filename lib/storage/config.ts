export function getStorageDriver(): string {
  return process.env.STORAGE_DRIVER ?? "local";
}

export function getLocalStoragePath(): string {
  return process.env.LOCAL_STORAGE_PATH ?? "./storage";
}

export function getMaxUploadSizeBytes(): number {
  const mb = Number(process.env.MAX_UPLOAD_SIZE_MB ?? "50");

  if (Number.isNaN(mb) || mb <= 0) {
    return 50 * 1024 * 1024;
  }

  return mb * 1024 * 1024;
}

export const PDF_MIME_TYPE = "application/pdf";
