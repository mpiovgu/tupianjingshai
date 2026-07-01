import { useState } from "react";
import type { ClassifyResult, CompetitorImage } from "../types";

type ResultsPanelProps = {
  results: ClassifyResult[];
  competitors: CompetitorImage[];
  onRetry: (id: string) => void;
  retryingId?: string | null;
};

type TabKey = "matched" | "excluded" | "error";

export function ResultsPanel({
  results,
  competitors,
  onRetry,
  retryingId,
}: ResultsPanelProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("matched");

  const matched = results.filter((r) => r.status === "matched");
  const excluded = results.filter((r) => r.status === "excluded");
  const errors = results.filter((r) => r.status === "error");

  const hasResults = results.some(
    (r) =>
      r.status === "matched" ||
      r.status === "excluded" ||
      r.status === "error",
  );

  if (!hasResults) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
        输入标题或上传主图后点击「开始筛选」，结果将显示在这里
      </div>
    );
  }

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "matched", label: "匹配竞品", count: matched.length },
    { key: "excluded", label: "已排除", count: excluded.length },
    { key: "error", label: "分析失败", count: errors.length },
  ];

  const activeList =
    activeTab === "matched"
      ? matched
      : activeTab === "excluded"
        ? excluded
        : errors;

  const competitorMap = new Map(competitors.map((c) => [c.id, c]));

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-base font-semibold text-slate-800">筛选结果</h2>
        <p className="mt-1 text-xs text-slate-500">
          共 {results.length} 张 → 匹配 {matched.length} 张 / 排除{" "}
          {excluded.length} 张 / 失败 {errors.length} 张
        </p>
      </div>

      <div className="flex border-b border-slate-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      <div className="p-5">
        {activeList.length === 0 ? (
          <p className="text-center text-sm text-slate-500 py-8">
            暂无{tabs.find((t) => t.key === activeTab)?.label}项
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activeList.map((result) => {
              const comp = competitorMap.get(result.id);
              return (
                <ResultCard
                  key={result.id}
                  result={result}
                  previewUrl={comp?.previewUrl}
                  title={comp?.title}
                  onRetry={() => onRetry(result.id)}
                  isRetrying={retryingId === result.id}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ResultCard({
  result,
  previewUrl,
  title,
  onRetry,
  isRetrying,
}: {
  result: ClassifyResult;
  previewUrl?: string;
  title?: string;
  onRetry: () => void;
  isRetrying: boolean;
}) {
  const statusBadge = {
    matched: "bg-green-100 text-green-700",
    excluded: "bg-slate-100 text-slate-600",
    error: "bg-red-100 text-red-700",
    analyzing: "bg-blue-100 text-blue-700",
    pending: "bg-slate-100 text-slate-500",
  }[result.status];

  const statusLabel = {
    matched: "匹配",
    excluded: "已排除",
    error: "失败",
    analyzing: "分析中",
    pending: "待分析",
  }[result.status];

  return (
    <div className="rounded-lg border border-slate-200 overflow-hidden">
      {previewUrl ? (
        <img
          src={previewUrl}
          alt="竞品"
          className="h-32 w-full object-cover bg-slate-50"
        />
      ) : (
        <div className="flex h-32 w-full items-center justify-center bg-slate-50 text-sm text-slate-400">
          未提供主图
        </div>
      )}
      <div className="p-3">
        <div className="flex items-center justify-between gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge}`}
          >
            {statusLabel}
          </span>
          {result.status === "error" && (
            <button
              type="button"
              onClick={onRetry}
              disabled={isRetrying}
              className="text-xs text-blue-600 hover:underline disabled:opacity-50"
            >
              {isRetrying ? "重试中…" : "重试"}
            </button>
          )}
        </div>

        {title?.trim() && (
          <p className="mt-2 break-words text-xs text-slate-500">
            标题：{title.trim()}
          </p>
        )}

        {result.competitorProductType && (
          <p className="mt-2 text-sm font-medium text-slate-800">
            {result.competitorProductType}
          </p>
        )}

        {result.reason && (
          <p className="mt-1 text-xs text-slate-500 leading-relaxed">
            {result.reason}
          </p>
        )}

        {result.error && (
          <p className="mt-1 text-xs text-red-600">{result.error}</p>
        )}
      </div>
    </div>
  );
}
