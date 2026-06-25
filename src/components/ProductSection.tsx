import type { CompetitorImage, ReferenceImage } from "../types";
import { ImageUploadZone } from "./ImageUploadZone";

type ProductSectionProps = {
  reference: ReferenceImage | null;
  competitors: CompetitorImage[];
  disabled?: boolean;
  onReferenceSelected: (file: File) => void;
  onReferenceRemove: () => void;
  onCompetitorsSelected: (files: File[]) => void;
  onCompetitorRemove: (index: number) => void;
};

export function ProductSection({
  reference,
  competitors,
  disabled = false,
  onReferenceSelected,
  onReferenceRemove,
  onCompetitorsSelected,
  onCompetitorRemove,
}: ProductSectionProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <ImageUploadZone
          label="我的商品主图"
          hint="上传您自己的商品主图，作为对标参考（必填）"
          disabled={disabled}
          previewUrl={reference?.previewUrl}
          onFilesSelected={(files) => onReferenceSelected(files[0])}
          onRemove={reference ? () => onReferenceRemove() : undefined}
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <ImageUploadZone
          label="竞品主图"
          hint="可上传 BSR 前 10～50 的竞品主图，系统将自动筛除非对标品类（如 liner、配件等）"
          multiple
          disabled={disabled}
          previewUrls={competitors.map((c) => c.previewUrl)}
          onFilesSelected={onCompetitorsSelected}
          onRemove={onCompetitorRemove}
        />
        {competitors.length > 0 && (
          <p className="mt-2 text-xs text-slate-500">
            已添加 {competitors.length} 张竞品图
          </p>
        )}
      </div>
    </div>
  );
}
