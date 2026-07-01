import { MODEL_NAME } from "../config";

type AnalysisPanelProps = {
  canAnalyze: boolean;
  isAnalyzing: boolean;
  current: number;
  total: number;
  onStart: () => void;
  onCancel: () => void;
};

export function AnalysisPanel({
  canAnalyze,
  isAnalyzing,
  current,
  total,
  onStart,
  onCancel,
}: AnalysisPanelProps) {
  const progress = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-800">智能筛选</h2>
          <p className="mt-1 text-xs text-slate-500">
            使用 {MODEL_NAME} 逐个对比外观结构、功能和标题信息
          </p>
        </div>

        <div className="flex gap-3">
          {isAnalyzing ? (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              取消
            </button>
          ) : (
            <button
              type="button"
              onClick={onStart}
              disabled={!canAnalyze}
              className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              开始筛选
            </button>
          )}
        </div>
      </div>

      {isAnalyzing && (
        <div className="mt-4">
          <div className="mb-2 flex justify-between text-sm text-slate-600">
            <span>正在分析第 {current} / {total} 张</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
