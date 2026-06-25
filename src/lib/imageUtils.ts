import {
  ALLOWED_IMAGE_TYPES,
  MAX_FILE_SIZE_BYTES,
  MAX_IMAGE_SIZE,
} from "../config";

export class ImageValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageValidationError";
  }
}

export function validateImageFile(file: File): void {
  if (
    !ALLOWED_IMAGE_TYPES.includes(
      file.type as (typeof ALLOWED_IMAGE_TYPES)[number],
    )
  ) {
    throw new ImageValidationError(
      "仅支持 JPEG、PNG、WebP 格式的图片",
    );
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new ImageValidationError("单张图片不能超过 10MB");
  }
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("读取图片失败"));
    reader.readAsDataURL(file);
  });
}

export function compressImage(
  file: File,
  maxSize = MAX_IMAGE_SIZE,
): Promise<string> {
  validateImageFile(file);

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;
      if (width > maxSize || height > maxSize) {
        const ratio = Math.min(maxSize / width, maxSize / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("无法创建画布"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("图片加载失败"));
    };

    img.src = objectUrl;
  });
}

export async function prepareImageDataUrl(file: File): Promise<string> {
  validateImageFile(file);
  return compressImage(file);
}

export function createImageId(): string {
  return crypto.randomUUID();
}
