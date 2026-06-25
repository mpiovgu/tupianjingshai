export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://49.232.90.152:9896/v1";

export const MODEL_NAME =
  import.meta.env.VITE_MODEL_NAME ?? "Qwen3-VL-4B";

export const API_KEY = import.meta.env.VITE_API_KEY ?? "";

export const MAX_IMAGE_SIZE = 1024;

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
