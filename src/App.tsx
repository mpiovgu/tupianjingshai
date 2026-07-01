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

function hasProductInput(product: {
  dataUrl?: string;
  file?: File;
  previewUrl?: string;
  title?: string;
}): boolean {
  return Boolean(
    product.dataUrl ||
      product.file ||
      product.previewUrl ||
      product.title?.trim(),
  );
}

export default function App() {
  const [reference, setReference] = useState<ReferenceImage>({ title: "" });
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
      const dataUrl = await prepareImageDataUrl(file);
      const previewUrl = URL.createObjectURL(file);
      setReference((prev) => {
        if (prev.previewUrl) {
          URL.revokeObjectURL(prev.previewUrl);
        }
        return { ...prev, file, previewUrl, dataUrl };
      });
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
    setReference((prev) => {
      if (prev.previewUrl) {
        URL.revokeObjectURL(prev.previewUrl);
      }
      return { title: prev.title };
    });
    setResults([]);
  }, []);

  const handleReferenceTitleChange = useCallback((title: string) => {
    setReference((prev) => ({ ...prev, title }));
    setResults([]);
  }, []);

  const handleCompetitorsSelected = useCallback(async (files: File[]) => {
    for (const file of files) {
      try {
        const dataUrl = await prepareImageDataUrl(file);
        const previewUrl = URL.createObjectURL(file);
        const id = createImageId();
        setCompetitors((prev) => [
          ...prev,
          { id, file, previewUrl, dataUrl, title: "" },
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

  const handleCompetitorAdd = useCallback(() => {
    const id = createImageId();
    setCompetitors((prev) => [...prev, { id, title: "" }]);
    setResults((prev) => [...prev, { id, status: "pending" }]);
  }, []);

  const handleCompetitorTitleChange = useCallback(
    (id: string, title: string) => {
      setCompetitors((prev) =>
        prev.map((comp) =>
          comp.id === id ? { ...comp, title } : comp,
        ),
      );
      setResults((prev) =>
        prev.map((result) =>
          result.id === id ? { id, status: "pending" } : result,
        ),
      );
    },
    [],
  );

  const handleCompetitorRemove = useCallback(
    (index: number) => {
      const comp = competitors[index];
      if (!comp) return;
      if (comp.previewUrl) {
        URL.revokeObjectURL(comp.previewUrl);
      }
      setCompetitors((prev) => prev.filter((_, i) => i !== index));
      setResults((prev) => prev.filter((r) => r.id !== comp.id));
    },
    [competitors],
  );

  const ensureDataUrls = async () => {
    let refDataUrl = reference.dataUrl;
    if (reference.file && !refDataUrl) {
      refDataUrl = await prepareImageDataUrl(reference.file);
      setReference((prev) =>
        ({ ...prev, dataUrl: refDataUrl }),
      );
    }

    const compsWithData = await Promise.all(
      competitors.map(async (c) => {
        if (!c.file || c.dataUrl) return c;
        const dataUrl = await prepareImageDataUrl(c.file);
        return { ...c, dataUrl };
      }),
    );

    setCompetitors(compsWithData);
    return { refDataUrl, compsWithData };
  };

  const handleStart = async () => {
    const hasReference = hasProductInput(reference);
    const hasCompetitor = competitors.some(hasProductInput);

    if (!hasReference || !hasCompetitor) {
      showError("请至少提供我的商品标题或主图，并至少提供一个竞品标题或主图");
      return;
    }

    setErrorMessage(null);
    setIsAnalyzing(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const { refDataUrl, compsWithData } = await ensureDataUrls();
      const referenceInput = {
        dataUrl: refDataUrl,
        title: reference.title.trim(),
      };
      const analyzableCompetitors = compsWithData.filter(hasProductInput);

      if (!hasProductInput(referenceInput)) {
        throw new Error("我的商品信息未就绪");
      }
      if (analyzableCompetitors.length === 0) {
        throw new Error("竞品信息未就绪");
      }

      setProgress({ current: 0, total: analyzableCompetitors.length });
      setResults(
        analyzableCompetitors.map((c) => ({
          id: c.id,
          status: "pending" as const,
        })),
      );

      await classifyCompetitors(
        referenceInput,
        analyzableCompetitors.map((c) => ({
          id: c.id,
          dataUrl: c.dataUrl,
          title: c.title.trim(),
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
    if (!hasProductInput(reference)) return;

    setRetryingId(id);
    try {
      const { refDataUrl, compsWithData } = await ensureDataUrls();
      const comp = compsWithData.find((c) => c.id === id);
      const referenceInput = {
        dataUrl: refDataUrl,
        title: reference.title.trim(),
      };
      const competitorInput = comp
        ? { dataUrl: comp.dataUrl, title: comp.title.trim() }
        : null;

      if (!hasProductInput(referenceInput) || !competitorInput) {
        throw new Error("商品信息未就绪");
      }
      if (!hasProductInput(competitorInput)) {
        throw new Error("竞品信息未就绪");
      }

      setResults((prev) =>
        prev.map((r) =>
          r.id === id ? { id, status: "analyzing" } : r,
        ),
      );

      const result = await classifySingleCompetitor(
        referenceInput,
        id,
        competitorInput,
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
    hasProductInput(reference) &&
    competitors.some(hasProductInput) &&
    !isAnalyzing;

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            图片竞筛
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            竞品智能筛选 — 优先识别外观结构相似的对标款
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
          onReferenceTitleChange={handleReferenceTitleChange}
          onCompetitorsSelected={handleCompetitorsSelected}
          onCompetitorRemove={handleCompetitorRemove}
          onCompetitorTitleChange={handleCompetitorTitleChange}
          onCompetitorAdd={handleCompetitorAdd}
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
