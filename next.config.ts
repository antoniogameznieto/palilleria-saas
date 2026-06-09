import type { NextConfig } from "next";

const maxUploadSizeMb = Number(process.env.MAX_UPLOAD_SIZE_MB ?? "50");
const maxUploadBodySize =
  `${maxUploadSizeMb}mb` as `${number}${"mb" | "kb" | "gb"}`;

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@prisma/client",
    "prisma",
    "pdf-parse",
    "pdfjs-dist",
    "exceljs",
    "@napi-rs/canvas",
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: maxUploadBodySize,
    },
    proxyClientMaxBodySize: maxUploadBodySize,
  },
};

export default nextConfig;
