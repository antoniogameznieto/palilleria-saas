import { formatFileSize } from "@/lib/drawings/format";

type FileSizeProps = {
  bytes: bigint | number | null | undefined;
};

export function FileSize({ bytes }: FileSizeProps) {
  return <span>{formatFileSize(bytes)}</span>;
}
