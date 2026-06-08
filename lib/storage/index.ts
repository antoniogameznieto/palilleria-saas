import { getStorageDriver } from "@/lib/storage/config";
import {
  deleteFile as deleteLocalFile,
  ensureStorageDir,
  getFile as getLocalFile,
  uploadFile as uploadLocalFile,
} from "@/lib/storage/local";

export {
  buildDrawingRelativeDir,
  buildDrawingStoragePath,
  sanitizeFileName,
} from "@/lib/storage/paths";

export {
  getLocalStoragePath,
  getMaxUploadSizeBytes,
  getStorageDriver,
  PDF_MIME_TYPE,
} from "@/lib/storage/config";

export { ensureStorageDir };

type StorageFileParams = {
  storagePath: string;
  buffer?: Buffer;
};

export async function uploadFile(params: StorageFileParams & { buffer: Buffer }) {
  if (getStorageDriver() !== "local") {
    throw new Error("Solo el almacenamiento local está implementado en esta fase.");
  }

  return uploadLocalFile(params);
}

export async function getFile(params: StorageFileParams) {
  if (getStorageDriver() !== "local") {
    throw new Error("Solo el almacenamiento local está implementado en esta fase.");
  }

  return getLocalFile(params);
}

export async function deleteFile(params: StorageFileParams) {
  if (getStorageDriver() !== "local") {
    throw new Error("Solo el almacenamiento local está implementado en esta fase.");
  }

  return deleteLocalFile(params);
}
