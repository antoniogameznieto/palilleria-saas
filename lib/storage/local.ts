import fs from "fs/promises";
import path from "path";

import { getLocalStoragePath } from "@/lib/storage/config";

export function getStorageRoot(): string {
  return path.resolve(process.cwd(), getLocalStoragePath());
}

export async function ensureStorageDir(relativeDir: string): Promise<string> {
  const fullDir = path.join(getStorageRoot(), relativeDir);
  await fs.mkdir(fullDir, { recursive: true });
  return fullDir;
}

function resolveStoragePath(storagePath: string): string {
  const root = getStorageRoot();
  const resolved = path.resolve(root, storagePath);

  if (!resolved.startsWith(root + path.sep) && resolved !== root) {
    throw new Error("Ruta de almacenamiento no válida.");
  }

  return resolved;
}

type UploadFileParams = {
  storagePath: string;
  buffer: Buffer;
};

type GetFileParams = {
  storagePath: string;
};

type DeleteFileParams = {
  storagePath: string;
};

export async function uploadFile({
  storagePath,
  buffer,
}: UploadFileParams): Promise<string> {
  const relativeDir = path.dirname(storagePath);
  await ensureStorageDir(relativeDir);

  const fullPath = resolveStoragePath(storagePath);
  await fs.writeFile(fullPath, buffer);

  return storagePath.replace(/\\/g, "/");
}

export async function getFile({ storagePath }: GetFileParams): Promise<Buffer> {
  const fullPath = resolveStoragePath(storagePath);
  return fs.readFile(fullPath);
}

export async function deleteFile({ storagePath }: DeleteFileParams): Promise<void> {
  const fullPath = resolveStoragePath(storagePath);

  try {
    await fs.unlink(fullPath);
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return;
    }

    throw error;
  }
}
