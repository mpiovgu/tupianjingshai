import { useState } from "react";
import type { ClassifyResult, CompetitorImage } from "../types";

type ResultsPanelProps = {
  results: ClassifyResult[];
  competitors: CompetitorImage[];
  onRetry: (id: string) => void;
  retryingId?: string | null;
};

type TabKey = "matched" | "excluded" | "error";
type ScoreSortMode = "default" | "scoreDesc" | "scoreAsc";

function sortResultsByScore(
  results: ClassifyResult[],
  mode: ScoreSortMode,
): ClassifyResult[] {
  if (mode === "default") return results;

  return [...results].sort((a, b) => {
    const scoreA = typeof a.matchScore === "number" ? a.matchScore : null;
    const scoreB = typeof b.matchScore === "number" ? b.matchScore : null;

    if (scoreA === null && scoreB === null) return 0;
    if (scoreA === null) return 1;
    if (scoreB === null) return -1;

    return mode === "scoreDesc" ? scoreB - scoreA : scoreA - scoreB;
  });
}

export function ResultsPanel({
  results,
  competitors,
  onRetry,
  retryingId,
}: ResultsPanelProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("matched");
  const [scoreSortMode, setScoreSortMode] =
    useState<ScoreSortMode>("scoreDesc");

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
  const sortedActiveList = sortResultsByScore(activeList, scoreSortMode);

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

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
        <p className="text-xs text-slate-500">
          {scoreSortMode === "default"
            ? "按分析完成顺序展示"
            : "按匹配度分数排序展示"}
        </p>
        <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
          排序
          <select
            value={scoreSortMode}
            onChange={(event) =>
              setScoreSortMode(event.target.value as ScoreSortMode)
            }
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 outline-none transition-colors hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="scoreDesc">匹配度从高到低</option>
            <option value="scoreAsc">匹配度从低到高</option>
            <option value="default">默认顺序</option>
          </select>
        </label>
      </div>

      <div className="p-5">
        {sortedActiveList.length === 0 ? (
          <p className="text-center text-sm text-slate-500 py-8">
            暂无{tabs.find((t) => t.key === activeTab)?.label}项
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sortedActiveList.map((result) => {
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

  const scoreTone =
    typeof result.matchScore !== "number"
      ? ""
      : result.matchScore >= 80
        ? "bg-green-50 text-green-700"
        : result.matchScore >= 60
          ? "bg-amber-50 text-amber-700"
          : "bg-slate-100 text-slate-600";

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
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge}`}
            >
              {statusLabel}
            </span>
            {typeof result.matchScore === "number" && (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${scoreTone}`}
              >
                匹配度 {result.matchScore}%
              </span>
            )}
          </div>
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
