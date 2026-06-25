import { useCallback, useRef, useState } from "react";
import { AnalysisPanel } from "./components/AnalysisPanel";
import { ProductSection } from "./components/ProductSection";
import { ResultsPanel } from "./components/ResultsPanel";
import {
  classifyCompetitors,
  classifySingleCompetitor,
} from "./lib/classifyProduct";
import {
  createImageId,
  ImageValidationError,
  prepareImageDataUrl,
} from "./lib/imageUtils";
import type {
  ClassifyResult,
  CompetitorImage,
  ReferenceImage,
} from "./types";

export default function App() {
  const [reference, setReference] = useState<ReferenceImage | null>(null);
  const [competitors, setCompetitors] = useState<CompetitorImage[]>([]);
  const [results, setResults] = useState<ClassifyResult[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const showError = (msg: string) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(null), 5000);
  };

  const handleReferenceSelected = useCallback(async (file: File) => {
    try {
      const previewUrl = URL.createObjectURL(file);
      const dataUrl = await prepareImageDataUrl(file);
      setReference({ file, previewUrl, dataUrl });
      setResults([]);
    } catch (err) {
      showError(
        err instanceof ImageValidationError
          ? err.message
          : "主图处理失败",
      );
    }
  }, []);

  const handleReferenceRemove = useCallback(() => {
    if (reference?.previewUrl) {
      URL.revokeObjectURL(reference.previewUrl);
    }
    setReference(null);
    setResults([]);
  }, [reference]);

  const handleCompetitorsSelected = useCallback(async (files: File[]) => {
    for (const file of files) {
      try {
        const previewUrl = URL.createObjectURL(file);
        const dataUrl = await prepareImageDataUrl(file);
        const id = createImageId();
        setCompetitors((prev) => [
          ...prev,
          { id, file, previewUrl, dataUrl },
        ]);
        setResults((prev) => [...prev, { id, status: "pending" }]);
      } catch (err) {
        showError(
          err instanceof ImageValidationError
            ? err.message
            : `图片 ${file.name} 处理失败`,
        );
      }
    }
  }, []);

  const handleCompetitorRemove = useCallback(
    (index: number) => {
      const comp = competitors[index];
      if (!comp) return;
      URL.revokeObjectURL(comp.previewUrl);
      setCompetitors((prev) => prev.filter((_, i) => i !== index));
      setResults((prev) => prev.filter((r) => r.id !== comp.id));
    },
    [competitors],
  );

  const ensureDataUrls = async () => {
    let refDataUrl = reference?.dataUrl;
    if (reference && !refDataUrl) {
      refDataUrl = await prepareImageDataUrl(reference.file);
      setReference((prev) =>
        prev ? { ...prev, dataUrl: refDataUrl } : prev,
      );
    }

    const compsWithData = await Promise.all(
      competitors.map(async (c) => {
        if (c.dataUrl) return c;
        const dataUrl = await prepareImageDataUrl(c.file);
        return { ...c, dataUrl };
      }),
    );

    setCompetitors(compsWithData);
    return { refDataUrl, compsWithData };
  };

  const handleStart = async () => {
    if (!reference || competitors.length === 0) return;

    setErrorMessage(null);
    setIsAnalyzing(true);
    setProgress({ current: 0, total: competitors.length });

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const { refDataUrl, compsWithData } = await ensureDataUrls();
      if (!refDataUrl) {
        throw new Error("主图未就绪");
      }

      setResults(
        compsWithData.map((c) => ({ id: c.id, status: "pending" as const })),
      );

      await classifyCompetitors(
        refDataUrl,
        compsWithData.map((c) => ({
          id: c.id,
          dataUrl: c.dataUrl!,
        })),
        (current, total, result) => {
          setProgress({ current, total });
          setResults((prev) => {
            const next = [...prev];
            const idx = next.findIndex((r) => r.id === result.id);
            if (idx >= 0) {
              next[idx] = result;
            } else {
              next.push(result);
            }
            return next;
          });
        },
        controller.signal,
      );
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        showError("已取消分析");
      } else {
        showError(
          err instanceof Error ? err.message : "分析过程出错",
        );
      }
    } finally {
      setIsAnalyzing(false);
      abortRef.current = null;
    }
  };

  const handleCancel = () => {
    abortRef.current?.abort();
  };

  const handleRetry = async (id: string) => {
    if (!reference) return;

    setRetryingId(id);
    try {
      const { refDataUrl, compsWithData } = await ensureDataUrls();
      const comp = compsWithData.find((c) => c.id === id);
      if (!refDataUrl || !comp?.dataUrl) {
        throw new Error("图片数据未就绪");
      }

      setResults((prev) =>
        prev.map((r) =>
          r.id === id ? { id, status: "analyzing" } : r,
        ),
      );

      const result = await classifySingleCompetitor(
        refDataUrl,
        id,
        comp.dataUrl,
      );

      setResults((prev) =>
        prev.map((r) => (r.id === id ? result : r)),
      );
    } catch (err) {
      showError(
        err instanceof Error ? err.message : "重试失败",
      );
    } finally {
      setRetryingId(null);
    }
  };

  const canAnalyze =
    reference !== null && competitors.length > 0 && !isAnalyzing;

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            图片竞筛
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            竞品主图智能筛选 — 从 BSR 竞品中识别同一产品类型
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 space-y-6">
        {errorMessage && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <ProductSection
          reference={reference}
          competitors={competitors}
          disabled={isAnalyzing}
          onReferenceSelected={handleReferenceSelected}
          onReferenceRemove={handleReferenceRemove}
          onCompetitorsSelected={handleCompetitorsSelected}
          onCompetitorRemove={handleCompetitorRemove}
        />

        <AnalysisPanel
          canAnalyze={canAnalyze}
          isAnalyzing={isAnalyzing}
          current={progress.current}
          total={progress.total}
          onStart={handleStart}
          onCancel={handleCancel}
        />

        <ResultsPanel
          results={results}
          competitors={competitors}
          onRetry={handleRetry}
          retryingId={retryingId}
        />
      </main>
    </div>
  );
}
