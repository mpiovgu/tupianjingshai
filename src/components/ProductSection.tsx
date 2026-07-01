import type { CompetitorImage, ReferenceImage } from "../types";
import { ImageUploadZone } from "./ImageUploadZone";

type ProductSectionProps = {
  reference: ReferenceImage | null;
  competitors: CompetitorImage[];
  disabled?: boolean;
  onReferenceSelected: (file: File) => void;
  onReferenceRemove: () => void;
  onReferenceTitleChange: (title: string) => void;
  onCompetitorsSelected: (files: File[]) => void;
  onCompetitorRemove: (index: number) => void;
  onCompetitorTitleChange: (id: string, title: string) => void;
  onCompetitorAdd: () => void;
};

export function ProductSection({
  reference,
  competitors,
  disabled = false,
  onReferenceSelected,
  onReferenceRemove,
  onReferenceTitleChange,
  onCompetitorsSelected,
  onCompetitorRemove,
  onCompetitorTitleChange,
  onCompetitorAdd,
}: ProductSectionProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <label className="mb-4 block">
          <span className="text-sm font-semibold text-slate-800">
            我的商品标题
          </span>
          <span className="mt-1 block text-xs text-slate-500">
            可选；标题用于补充功能、尺寸、材质等信息
          </span>
          <textarea
            value={reference?.title ?? ""}
            onChange={(e) => onReferenceTitleChange(e.target.value)}
            disabled={disabled}
            rows={3}
            placeholder="粘贴 Amazon 商品标题，例如：Ceramic Slow Cooker, 6 Quart..."
            className="mt-2 w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-500"
          />
        </label>
        <ImageUploadZone
          label="我的商品主图"
          hint="可选；上传后优先按外观结构寻找相似对标款"
          disabled={disabled}
          previewUrl={reference?.previewUrl}
          onFilesSelected={(files) => onReferenceSelected(files[0])}
          onRemove={reference?.previewUrl ? () => onReferenceRemove() : undefined}
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <ImageUploadZone
          label="竞品主图"
          hint="可选；可上传 BSR 前 10～50 的竞品主图，系统会优先比较外观结构"
          multiple
          disabled={disabled}
          onFilesSelected={onCompetitorsSelected}
        />

        <div className="mt-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">
              竞品标题
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              可选；每个竞品可填写标题，标题和图片至少保留一项
            </p>
          </div>
          <button
            type="button"
            onClick={onCompetitorAdd}
            disabled={disabled}
            className="shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            添加标题
          </button>
        </div>

        {competitors.length > 0 && (
          <div className="mt-3 space-y-3">
            {competitors.map((competitor, index) => (
              <div
                key={competitor.id}
                className="rounded-lg border border-slate-200 p-3"
              >
                <div className="flex gap-3">
                  {competitor.previewUrl ? (
                    <img
                      src={competitor.previewUrl}
                      alt={`竞品 ${index + 1}`}
                      className="h-20 w-20 rounded-lg border border-slate-200 object-cover bg-white"
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-xs text-slate-400">
                      无主图
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-slate-500">
                        竞品 {index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => onCompetitorRemove(index)}
                        disabled={disabled}
                        className="text-xs text-red-600 hover:underline disabled:opacity-50"
                      >
                        删除
                      </button>
                    </div>
                    <textarea
                      value={competitor.title}
                      onChange={(e) =>
                        onCompetitorTitleChange(
                          competitor.id,
                          e.target.value,
                        )
                      }
                      disabled={disabled}
                      rows={2}
                      placeholder="粘贴该竞品标题（可选）"
                      className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-500"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
