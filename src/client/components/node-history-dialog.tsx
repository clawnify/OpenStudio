import { useEffect } from "react";
import { createPortal } from "react-dom";
import { RotateCcw, X, Columns2, Download } from "lucide-react";
import { downloadImage } from "../download";
import type { Generation } from "../types";

interface Props {
  /** All generations of the workflow, newest first. */
  generations: Generation[];
  /** The generation whose node history we're browsing. */
  target: Generation;
  onRestore: (runId: string) => void;
  onCompare: (gen: Generation) => void;
  onClose: () => void;
}

/**
 * Version history for one node: every generation ever produced for that
 * node_id across all runs, newest first. Each version can be restored to the
 * canvas (loads its run snapshot) or picked as a compare candidate.
 */
export function NodeHistoryDialog({ generations, target, onRestore, onCompare, onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const versions = generations.filter((g) => g.node_id === target.node_id);
  const current = target.run_id;

  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[1000] bg-black/80 flex items-center justify-center p-6" onClick={onClose}>
      <div
        className="bg-surface border border-border rounded-md w-full max-w-3xl max-h-[85vh] flex flex-col shadow-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div>
            <h3 className="text-sm font-semibold text-default">Node history</h3>
            <p className="text-[11px] text-faint">
              {versions.length} version{versions.length === 1 ? "" : "s"} of node <span className="font-mono">{target.node_id}</span>
            </p>
          </div>
          <button
            className="inline-flex items-center justify-center text-muted hover:text-default border-none bg-transparent rounded-sm p-1 cursor-pointer"
            onClick={onClose}
            title="Close (Esc)"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-4">
          {versions.length === 1 ? (
            <div className="text-faint text-sm text-center py-8">
              Only one generation for this node so far. Re-run it (or use feedback iterate) to build history.
            </div>
          ) : (
            <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(160px,1fr))]">
              {versions.map((gen, i) => (
                <div key={gen.id} className="relative bg-surface-sunken border border-border rounded-sm overflow-hidden group">
                  {gen.image_url ? (
                    <div className="relative aspect-square">
                      <img src={gen.image_url} alt={gen.prompt} loading="lazy" className="w-full h-full object-cover" />
                      {gen.run_id === current && (
                        <span className="absolute top-1.5 left-1.5 text-[9px] text-white bg-black/70 rounded-sm px-1.5 py-0.5">in canvas</span>
                      )}
                      <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {gen.run_id && (
                          <button
                            className="inline-flex items-center justify-center text-white bg-black/60 hover:bg-black/80 border-none rounded-sm p-1 cursor-pointer"
                            onClick={() => onRestore(gen.run_id!)}
                            title="Load the workflow state from this run into the canvas"
                          >
                            <RotateCcw size={12} />
                          </button>
                        )}
                        <button
                          className="inline-flex items-center justify-center text-white bg-black/60 hover:bg-black/80 border-none rounded-sm p-1 cursor-pointer"
                          onClick={() => onCompare(gen)}
                          title="Pick this version for side-by-side compare"
                        >
                          <Columns2 size={12} />
                        </button>
                        <button
                          className="inline-flex items-center justify-center text-white bg-black/60 hover:bg-black/80 border-none rounded-sm p-1 cursor-pointer"
                          onClick={() => downloadImage(gen.image_url!, `${gen.node_id}-${gen.id}.png`)}
                          title="Download image"
                        >
                          <Download size={12} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="aspect-square flex items-center justify-center text-danger text-[10px] text-center px-2">
                      {gen.status === "error" ? "Failed" : gen.status}
                    </div>
                  )}
                  <div className="p-1.5 border-t border-border">
                    <p className="text-[10px] text-faint line-clamp-1">{gen.prompt}</p>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-[9px] text-faint truncate">{gen.model.split("/").pop()}</span>
                      <span className="text-[9px] text-faint shrink-0">
                        {i === 0 ? "latest" : formatDate(gen.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function formatDate(s: string): string {
  const d = new Date(s.replace(" ", "T") + "Z");
  if (isNaN(d.getTime())) return s;
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffMin < 24 * 60) return `${Math.floor(diffMin / 60)}h ago`;
  return d.toLocaleDateString();
}
