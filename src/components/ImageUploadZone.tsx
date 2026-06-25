import { useCallback, useRef, useState } from "react";

type ImageUploadZoneProps = {
  label: string;
  hint?: string;
  multiple?: boolean;
  disabled?: boolean;
  previewUrl?: string | null;
  previewUrls?: string[];
  onFilesSelected: (files: File[]) => void;
  onRemove?: (index: number) => void;
};

export function ImageUploadZone({
  label,
  hint,
  multiple = false,
  disabled = false,
  previewUrl,
  previewUrls,
  onFilesSelected,
  onRemove,
}: ImageUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList?.length || disabled) return;
      const files = Array.from(fileList);
      onFilesSelected(multiple ? files : [files[0]]);
    },
    [disabled, multiple, onFilesSelected],
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const showGrid = multiple && previewUrls && previewUrls.length > 0;
  const showSingle = !multiple && previewUrl;

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h3 className="text-sm font-semibold text-slate-800">{label}</h3>
        {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      </div>

      {showSingle && (
        <div className="relative mx-auto w-full max-w-xs">
          <img
            src={previewUrl}
            alt="预览"
            className="rounded-lg border border-slate-200 object-contain max-h-48 w-full bg-white"
          />
          {onRemove && (
            <button
              type="button"
              onClick={() => onRemove(0)}
              disabled={disabled}
              className="absolute -right-2 -top-2 rounded-full bg-red-500 px-2 py-0.5 text-xs text-white shadow hover:bg-red-600 disabled:opacity-50"
            >
              删除
            </button>
          )}
        </div>
      )}

      {showGrid && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {previewUrls.map((url, index) => (
            <div key={url + index} className="relative">
              <img
                src={url}
                alt={`竞品 ${index + 1}`}
                className="h-24 w-full rounded-lg border border-slate-200 object-cover bg-white"
              />
              {onRemove && (
                <button
                  type="button"
                  onClick={() => onRemove(index)}
                  disabled={disabled}
                  className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] text-white shadow hover:bg-red-600 disabled:opacity-50"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`
          flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 transition-colors cursor-pointer
          ${disabled ? "opacity-50 cursor-not-allowed bg-slate-50" : "bg-white hover:border-blue-400 hover:bg-blue-50/30"}
          ${isDragging ? "border-blue-500 bg-blue-50" : "border-slate-300"}
        `}
      >
        <svg
          className="mb-2 h-8 w-8 text-slate-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <p className="text-sm text-slate-600">
          点击或拖拽上传{multiple ? "（支持多选）" : ""}
        </p>
        <p className="mt-1 text-xs text-slate-400">JPEG / PNG / WebP，最大 10MB</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple={multiple}
          disabled={disabled}
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
