import { useEffect, useState } from "react";
import { Download, Trash2, RotateCcw, MessageSquare, Copy, Check, Columns2, History, GitCompare } from "lucide-react";
import { useWorkflow } from "../context";
import { FeedbackDialog } from "./feedback-dialog";
import { ImageLightbox } from "./image-lightbox";
import { CompareView } from "./compare-view";
import { NodeHistoryDialog } from "./node-history-dialog";
import { downloadImage } from "../download";
import { formatCost, sumCost } from "../cost";
import type { Generation } from "../types";

interface Props {
  onLoaded?: () => void;
}

export function WorkflowOutputs({ onLoaded }: Props = {}) {
  const { generations, activeWorkflow, refreshGenerations, loadRun, deleteGeneration, features: { costUnit } } = useWorkflow();
  const [selected, setSelected] = useState<Generation | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [feedbackTarget, setFeedbackTarget] = useState<Generation | null>(null);
  const [historyTarget, setHistoryTarget] = useState<Generation | null>(null);
  const [comparing, setComparing] = useState<[Generation, Generation] | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);

  const comparePair = compareIds
    .map((id) => generations.find((g) => g.id === id))
    .filter((g): g is Generation => !!g);
  const toggleCompare = (id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((p) => p !== id);
      return [...prev, id].slice(-2);
    });
  };

  const loadIntoCanvas = async (runId: string) => {
    await loadRun(runId);
    onLoaded?.();
  };

  // Refresh on view open / workflow switch so the grid is always current
  // without forcing the user to reload the page.
  useEffect(() => {
    refreshGenerations();
    setCompareIds([]);
  }, [refreshGenerations, activeWorkflow?.id]);

  const copyPrompt = async (id: string, prompt: string) => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopiedId(id);
      setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 1200);
    } catch {}
  };

  if (!activeWorkflow) {
    return (
      <div className="flex-1 flex items-center justify-center text-faint text-sm">
        Select a workflow to see its outputs.
      </div>
    );
  }

  if (generations.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-faint text-sm">
        No generations yet for this workflow. Run it to produce outputs.
      </div>
    );
  }

  // What this workflow has cost so far, and what the newest run cost. Both are
  // sums of what the provider actually billed, so a generation whose cost the
  // provider did not report is simply left out rather than guessed at.
  const latestRunId = generations.find((g) => g.run_id)?.run_id ?? null;
  const latestRun = latestRunId ? generations.filter((g) => g.run_id === latestRunId) : [];
  const latestRunCost = formatCost(sumCost(latestRun.map((g) => g.cost_usd)), costUnit);
  const totalCost = formatCost(sumCost(generations.map((g) => g.cost_usd)), costUnit);

  return (
    <div className="flex-1 overflow-y-auto bg-background p-4">
      {(totalCost || latestRunCost) && (
        <div className="flex items-center gap-4 mb-3 text-[11px] text-faint">
          {latestRunCost && (
            <span>
              Last run
              <span className="ml-1.5 text-muted font-medium">{latestRunCost}</span>
              <span className="ml-1">({latestRun.length} {latestRun.length === 1 ? "image" : "images"})</span>
            </span>
          )}
          {totalCost && (
            <span>
              This workflow
              <span className="ml-1.5 text-muted font-medium">{totalCost}</span>
            </span>
          )}
        </div>
      )}
      <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(220px,1fr))]">
        {generations.map((gen) => (
          <div
            key={gen.id}
            className={`relative bg-surface rounded-md border overflow-hidden transition-all group ${
              gen.status === "error" ? "border-border" : "border-border hover:border-border-strong"
            }`}
          >
            {gen.image_url ? (
              <div className="relative group">
                <button
                  className="w-full aspect-square bg-surface-sunken border-none p-0 cursor-pointer overflow-hidden"
                  onClick={() => gen.image_url && setSelected(gen)}
                >
                  <img
                    src={gen.image_url}
                    alt={gen.prompt}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                </button>
                <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    className="inline-flex items-center justify-center text-white bg-black/60 hover:bg-black/80 border-none rounded-sm p-1 cursor-pointer"
                    onClick={(e) => { e.stopPropagation(); if (gen.image_url) downloadImage(gen.image_url, `${gen.node_id}-${gen.id}.png`); }}
                    title="Download image"
                  >
                    <Download size={12} />
                  </button>
                  {gen.run_id && (
                    <>
                      <button
                        className="inline-flex items-center justify-center text-white bg-black/60 hover:bg-black/80 border-none rounded-sm p-1 cursor-pointer"
                        onClick={(e) => { e.stopPropagation(); loadIntoCanvas(gen.run_id!); }}
                        title="Load the workflow state from this run into the canvas"
                      >
                        <RotateCcw size={12} />
                      </button>
                      <button
                        className="inline-flex items-center justify-center text-white bg-black/60 hover:bg-black/80 border-none rounded-sm p-1 cursor-pointer"
                        onClick={(e) => { e.stopPropagation(); setFeedbackTarget(gen); }}
                        title="Iterate on this output by adding prompt feedback and re-running"
                      >
                        <MessageSquare size={12} />
                      </button>
                    </>
                  )}
                  <button
                    className={`inline-flex items-center justify-center text-white border-none rounded-sm p-1 cursor-pointer transition-colors ${
                      compareIds.includes(gen.id) ? "bg-link hover:bg-link" : "bg-black/60 hover:bg-black/80"
                    }`}
                    onClick={(e) => { e.stopPropagation(); toggleCompare(gen.id); }}
                    title={compareIds.includes(gen.id) ? "Remove from compare" : "Pick for side-by-side compare"}
                  >
                    <Columns2 size={12} />
                  </button>
                  {gen.node_id && (
                    <button
                      className="inline-flex items-center justify-center text-white bg-black/60 hover:bg-black/80 border-none rounded-sm p-1 cursor-pointer"
                      onClick={(e) => { e.stopPropagation(); setHistoryTarget(gen); }}
                      title="Version history of this node"
                    >
                      <History size={12} />
                    </button>
                  )}
                  <button
                    className="inline-flex items-center justify-center text-white bg-danger hover:bg-danger-hover border-none rounded-sm p-1 cursor-pointer"
                    onClick={(e) => { e.stopPropagation(); if (confirm("Delete this image? This cannot be undone.")) deleteGeneration(gen.id); }}
                    title="Delete this output"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative aspect-square flex items-center justify-center text-danger text-xs px-3 text-center">
                <div>
                  <div className="font-semibold mb-1">Failed</div>
                  {gen.error && <div className="text-[10px] text-faint">{gen.error.slice(0, 80)}</div>}
                </div>
                <button
                  className="absolute top-1.5 right-1.5 inline-flex items-center justify-center text-white bg-danger hover:bg-danger-hover border-none rounded-sm p-1 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => { e.stopPropagation(); if (confirm("Delete this entry? This cannot be undone.")) deleteGeneration(gen.id); }}
                  title="Delete this entry"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            )}
            <div className="p-2.5 border-t border-border">
              <p className="text-[11px] text-muted line-clamp-2 leading-snug min-h-[28px]">{gen.prompt}</p>
              <div className="flex items-center justify-between mt-1.5 gap-2">
                <span className="flex items-baseline gap-1.5 min-w-0 text-[10px] text-faint">
                  <span className="truncate">{gen.model.split("/").pop()}</span>
                  {formatCost(gen.cost_usd, costUnit) && (
                    <span className="shrink-0 text-faint/70">{formatCost(gen.cost_usd, costUnit)}</span>
                  )}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-faint">{formatDate(gen.created_at)}</span>
                  <button
                    className="inline-flex items-center gap-1 text-[10px] text-muted hover:text-link border border-border rounded-sm px-1.5 py-0.5 cursor-pointer transition-colors bg-surface"
                    onClick={() => copyPrompt(gen.id, gen.prompt)}
                    title="Copy prompt"
                  >
                    {copiedId === gen.id ? <><Check size={10} /> Copied</> : <><Copy size={10} /> Copy</>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {comparePair.length === 2 && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[900] inline-flex items-center gap-2 text-xs text-white bg-black/80 rounded-full px-2 py-1.5 shadow-md"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="pl-2 text-white/80">2 picked for compare</span>
          <button
            className="inline-flex items-center gap-1 text-white bg-white/20 hover:bg-white/30 border-none rounded-full px-2.5 py-1 cursor-pointer"
            onClick={() => setCompareIds([])}
          >
            Clear
          </button>
          <button
            className="inline-flex items-center gap-1.5 text-black bg-white hover:bg-white/90 border-none rounded-full px-3 py-1 cursor-pointer"
            onClick={() => setComparing(comparePair as [Generation, Generation])}
          >
            <GitCompare size={12} /> Compare
          </button>
        </div>
      )}

      <ImageLightbox
        src={selected?.image_url || null}
        filename={selected ? `${selected.node_id}-${selected.id}.png` : undefined}
        prompt={selected?.prompt}
        onClose={() => setSelected(null)}
      />

      <FeedbackDialog
        open={feedbackTarget !== null}
        onOpenChange={(o) => { if (!o) setFeedbackTarget(null); }}
        generation={feedbackTarget}
        onSubmitted={() => { setFeedbackTarget(null); onLoaded?.(); }}
      />

      {comparing && (
        <CompareView
          left={comparing[0]}
          right={comparing[1]}
          onRestore={async (runId) => {
            await loadIntoCanvas(runId);
            setComparing(null);
            setCompareIds([]);
          }}
          onClose={() => setComparing(null)}
        />
      )}

      {historyTarget && (
        <NodeHistoryDialog
          generations={generations}
          target={historyTarget}
          onRestore={async (runId) => {
            await loadIntoCanvas(runId);
            setHistoryTarget(null);
          }}
          onCompare={(gen) => {
            setHistoryTarget(null);
            setCompareIds([gen.id]);
          }}
          onClose={() => setHistoryTarget(null)}
        />
      )}
    </div>
  );
}

function formatDate(s: string): string {
  const d = new Date(s.replace(" ", "T") + "Z");
  if (isNaN(d.getTime())) return s;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return d.toLocaleDateString();
}
