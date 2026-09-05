import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Download, X, RotateCcw } from "lucide-react";
import { downloadImage } from "../download";
import type { Generation } from "../types";

interface Props {
  left: Generation;
  right: Generation;
  onRestore?: (runId: string) => void;
  onClose: () => void;
}

/** Side-by-side compare of exactly two generations. */
export function CompareView({ left, right, onRestore, onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[1000] bg-black/85 flex flex-col" onClick={onClose}>
      <div className="flex items-center justify-between px-4 py-3 shrink-0" onClick={(e) => e.stopPropagation()}>
        <button className="inline-flex items-center gap-1.5 text-xs text-white bg-black/70 hover:bg-black/90 border-none rounded-sm px-3 py-1.5 cursor-pointer" onClick={onClose} title="Close (Esc)">
          <X size={14} /> Close
        </button>
        <span className="text-[11px] text-white/70">Comparing two generations</span>
      </div>
      <div className="flex-1 min-h-0 grid grid-cols-2 gap-px bg-black/40 p-1" onClick={(e) => e.stopPropagation()}>
        <ComparePane gen={left} label="A" onRestore={onRestore} />
        <ComparePane gen={right} label="B" onRestore={onRestore} />
      </div>
    </div>,
    document.body,
  );
}

function ComparePane({ gen, label, onRestore }: { gen: Generation; label: string; onRestore?: (runId: string) => void }) {
  return (
    <div className="flex flex-col min-h-0 bg-surface">
      <div className="flex-1 min-h-0 flex items-center justify-center bg-black overflow-hidden">
        {gen.image_url ? (
          <img src={gen.image_url} alt={gen.prompt} className="max-w-full max-h-full object-contain" draggable={false} />
        ) : (
          <div className="text-white/60 text-xs">No image ({gen.status})</div>
        )}
      </div>
      <div className="p-3 shrink-0 border-t border-border">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-[10px] font-semibold text-faint uppercase tracking-wide">{label}</span>
          <div className="flex gap-1.5">
            {gen.image_url && (
              <button
                className="inline-flex items-center gap-1 text-[10px] text-muted hover:text-link border border-border rounded-sm px-1.5 py-0.5 cursor-pointer bg-surface transition-colors"
                onClick={() => downloadImage(gen.image_url!, `${gen.node_id}-${gen.id}.png`)}
                title="Download"
              >
                <Download size={10} /> Download
              </button>
            )}
            {gen.run_id && onRestore && (
              <button
                className="inline-flex items-center gap-1 text-[10px] text-muted hover:text-link border border-border rounded-sm px-1.5 py-0.5 cursor-pointer bg-surface transition-colors"
                onClick={() => onRestore(gen.run_id!)}
                title="Load the workflow state from this run into the canvas"
              >
                <RotateCcw size={10} /> Restore
              </button>
            )}
          </div>
        </div>
        <p className="text-[11px] text-muted leading-snug line-clamp-3">{gen.prompt}</p>
        <div className="flex items-center gap-2 mt-1 text-[10px] text-faint">
          <span className="truncate">{gen.model.split("/").pop()}</span>
          <span>·</span>
          <span>{formatDate(gen.created_at)}</span>
        </div>
      </div>
    </div>
  );
}

function formatDate(s: string): string {
  const d = new Date(s.replace(" ", "T") + "Z");
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
