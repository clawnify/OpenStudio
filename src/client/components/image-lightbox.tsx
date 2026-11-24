import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Download, Copy, Check, X, ImagePlus } from "lucide-react";
import { downloadImage } from "../download";

interface Props {
  src: string | null;
  filename?: string;
  prompt?: string;
  /** Adds the image to the prompt bar's sources (Generate page). */
  onUseAsSource?: () => void;
  onClose: () => void;
}

// On a phone the actions show their icon only, so all of them fit beside Close.
const actionClass = "inline-flex items-center justify-center gap-1.5 h-8 min-w-8 text-xs text-white bg-black/70 hover:bg-black/90 border-none rounded-sm px-2 sm:px-3 cursor-pointer";

export function ImageLightbox({ src, filename, prompt, onUseAsSource, onClose }: Props) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!src) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [src, onClose]);

  useEffect(() => { if (!src) setCopied(false); }, [src]);

  const copyPrompt = async () => {
    if (!prompt) return;
    let ok = false;
    try {
      await navigator.clipboard.writeText(prompt);
      ok = true;
    } catch {
      const ta = document.createElement("textarea");
      ta.value = prompt;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      try { ok = document.execCommand("copy"); } catch {}
      document.body.removeChild(ta);
    }
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    }
  };

  if (!src || typeof document === "undefined") return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[1000] bg-black/80 flex items-center justify-center cursor-pointer"
      onClick={onClose}
    >
      <img
        className="max-w-[90vw] max-h-[80dvh] sm:max-h-[90vh] object-contain cursor-default shadow-md"
        src={src}
        alt="Full size"
        onClick={(e) => e.stopPropagation()}
        draggable={false}
      />
      <button
        className={`absolute top-4 left-4 ${actionClass}`}
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        title="Close (Esc)"
      >
        <X size={14} /> Close
      </button>
      <div className="absolute top-4 right-4 flex gap-2">
        {onUseAsSource && (
          <button
            className={actionClass}
            onClick={(e) => { e.stopPropagation(); onUseAsSource(); }}
            aria-label="Use as source"
            title="Use as source"
          >
            <ImagePlus size={14} /><span className="hidden sm:inline">Use as source</span>
          </button>
        )}
        {prompt && (
          <button
            className={actionClass}
            onClick={(e) => { e.stopPropagation(); copyPrompt(); }}
            aria-label={copied ? "Copied" : "Copy prompt"}
            title="Copy prompt"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            <span className="hidden sm:inline">{copied ? "Copied" : "Copy prompt"}</span>
          </button>
        )}
        <button
          className={actionClass}
          onClick={(e) => { e.stopPropagation(); downloadImage(src, filename); }}
          aria-label="Download image"
          title="Download image"
        >
          <Download size={14} /><span className="hidden sm:inline">Download</span>
        </button>
      </div>
      {prompt && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-max max-w-[calc(100vw-2rem)] sm:w-auto sm:max-w-[80vw] text-[11px] text-white/90 bg-black/70 rounded-sm px-3 py-1.5 max-h-[20vh] overflow-y-auto whitespace-pre-wrap break-words cursor-default" onClick={(e) => e.stopPropagation()}>
          {prompt}
        </div>
      )}
    </div>,
    document.body,
  );
}
