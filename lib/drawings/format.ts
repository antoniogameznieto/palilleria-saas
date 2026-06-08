export function formatFileSize(bytes: bigint | number | null | undefined): string {
  if (bytes === null || bytes === undefined) {
    return "—";
  }

  const value = typeof bytes === "bigint" ? Number(bytes) : bytes;

  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}
