import { useCallback, useEffect, useRef, useState } from "react";
import { Palette, Plus, Trash2, Upload, X } from "lucide-react";
import { useWorkflow } from "../context";
import type { StylePreset } from "../types";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the saved preset's id, so a caller can select what it just created. */
  onSaved?: (id: string) => void;
}

interface Draft {
  id?: string;
  name: string;
  instruction: string;
  palette: string[];
  reference_images: string[];
}

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

function toDraft(p: StylePreset): Draft {
  return {
    id: p.id,
    name: p.name,
    instruction: p.instruction,
    palette: p.palette,
    reference_images: p.reference_images,
  };
}

const EMPTY: Draft = { name: "", instruction: "", palette: [], reference_images: [] };

/**
 * The style library. One place to author a style once — written direction,
 * a colour palette and reference images — and reuse it across every workflow.
 */
export function StylePresetsDialog({ open, onOpenChange, onSaved }: Props) {
  const { stylePresets, saveStylePreset, deleteStylePreset } = useWorkflow();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [hexInput, setHexInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Reset to a blank draft each time the dialog is opened.
  useEffect(() => {
    if (open) { setDraft(EMPTY); setHexInput(""); }
  }, [open]);

  const patch = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }));

  const addHex = useCallback(() => {
    const v = hexInput.trim();
    if (!HEX.test(v)) return;
    const normalized = v.toLowerCase();
    setDraft((d) => (d.palette.includes(normalized) ? d : { ...d, palette: [...d.palette, normalized] }));
    setHexInput("");
  }, [hexInput]);

  const upload = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body: form });
      const json = (await res.json()) as { url?: string };
      if (json.url) setDraft((d) => ({ ...d, reference_images: [...d.reference_images, json.url!] }));
    } catch {
      /* upload failed — the user can retry or paste a URL */
    } finally {
      setUploading(false);
    }
  }, []);

  const save = useCallback(async () => {
    if (!draft.name.trim() || saving) return;
    setSaving(true);
    const saved = await saveStylePreset({
      id: draft.id,
      name: draft.name,
      instruction: draft.instruction,
      palette: draft.palette,
      reference_images: draft.reference_images,
    });
    setSaving(false);
    if (saved) {
      onSaved?.(saved.id);
      setDraft(EMPTY);
      setHexInput("");
    }
  }, [draft, saving, saveStylePreset, onSaved]);

  const inputClass = "w-full bg-surface-sunken border border-border rounded-sm text-foreground text-sm p-2 outline-none focus:border-ring";
  const labelClass = "text-[10px] font-semibold text-muted uppercase tracking-wide";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Style presets</DialogTitle>
          <DialogDescription>
            Define a style once and reuse it across every workflow. A preset is added to the
            prompt at generation time, and its reference images are sent to the model ahead of
            any other inputs.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-[220px_1fr] gap-4 max-h-[60vh]">
          {/* Saved presets */}
          <div className="flex flex-col gap-1 overflow-y-auto border-r border-border pr-3">
            <button
              className="flex items-center gap-1.5 text-xs font-medium text-muted hover:text-foreground border border-dashed border-border rounded-sm px-2 py-1.5 cursor-pointer transition-colors"
              onClick={() => { setDraft(EMPTY); setHexInput(""); }}
            >
              <Plus className="size-3.5" /> New style
            </button>
            {stylePresets.length === 0 && (
              <p className="text-[11px] text-muted mt-2 leading-relaxed">No styles yet. Create one to lock a look across generations.</p>
            )}
            {stylePresets.map((p) => (
              <div
                key={p.id}
                className={`group flex items-center gap-2 rounded-sm px-2 py-1.5 cursor-pointer transition-colors ${draft.id === p.id ? "bg-surface-sunken" : "hover:bg-surface-sunken"}`}
                onClick={() => { setDraft(toDraft(p)); setHexInput(""); }}
              >
                <Palette className="size-3.5 text-muted shrink-0" />
                <span className="text-xs text-foreground truncate flex-1">{p.name}</span>
                <button
                  className="opacity-0 group-hover:opacity-100 text-muted hover:text-foreground cursor-pointer transition-opacity"
                  title={`Delete ${p.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteStylePreset(p.id);
                    if (draft.id === p.id) setDraft(EMPTY);
                  }}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Editor */}
          <div className="flex flex-col gap-3 overflow-y-auto pr-1">
            <div className="flex flex-col gap-1">
              <label className={labelClass}>Name</label>
              <input
                className={inputClass}
                placeholder="e.g. Brand — editorial matte"
                value={draft.name}
                onChange={(e) => patch({ name: (e.target as HTMLInputElement).value })}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className={labelClass}>Style direction</label>
              <textarea
                className={`${inputClass} min-h-[110px] resize-y leading-relaxed`}
                placeholder="Soft diffused daylight, muted earth tones, 50mm, shallow depth of field, subtle film grain, no text or logos."
                value={draft.instruction}
                onChange={(e) => patch({ instruction: (e.target as HTMLTextAreaElement).value })}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Palette</label>
              <div className="flex flex-wrap items-center gap-1.5">
                {draft.palette.map((hex) => (
                  <span key={hex} className="flex items-center gap-1 border border-border rounded-sm pl-1 pr-1.5 py-0.5">
                    <span className="size-3.5 rounded-[2px] border border-border-strong" style={{ backgroundColor: hex }} />
                    <span className="text-[11px] text-muted font-mono">{hex}</span>
                    <button
                      className="text-muted hover:text-foreground cursor-pointer"
                      title={`Remove ${hex}`}
                      onClick={() => patch({ palette: draft.palette.filter((h) => h !== hex) })}
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
                <input
                  className="w-24 bg-surface-sunken border border-border rounded-sm text-foreground text-[11px] font-mono px-1.5 py-1 outline-none focus:border-ring"
                  placeholder="#0f172a"
                  value={hexInput}
                  onChange={(e) => setHexInput((e.target as HTMLInputElement).value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addHex(); } }}
                  onBlur={addHex}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Reference images</label>
              <div className="flex flex-wrap items-center gap-1.5">
                {draft.reference_images.map((url) => (
                  <span key={url} className="relative size-14 rounded-sm overflow-hidden border border-border">
                    <img src={url} alt="Style reference" className="size-full object-cover" />
                    <button
                      className="absolute top-0.5 right-0.5 bg-surface/90 border border-border rounded-[2px] text-muted hover:text-foreground cursor-pointer"
                      title="Remove reference"
                      onClick={() => patch({ reference_images: draft.reference_images.filter((u) => u !== url) })}
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
                <button
                  className="flex flex-col items-center justify-center gap-0.5 size-14 border border-dashed border-border rounded-sm text-muted hover:text-foreground cursor-pointer transition-colors disabled:opacity-50"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                >
                  {uploading ? <span className="spinner !w-3.5 !h-3.5" /> : <Upload className="size-3.5" />}
                  <span className="text-[9px]">Add</span>
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = (e.target as HTMLInputElement).files?.[0];
                    if (f) upload(f);
                    (e.target as HTMLInputElement).value = "";
                  }}
                />
              </div>
              <p className="text-[10px] text-muted leading-relaxed">
                References anchor the look. They are sent only to models that accept reference images; the rest still get the written direction and palette.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={save} disabled={!draft.name.trim() || saving}>
            {saving ? "Saving..." : draft.id ? "Save changes" : "Create style"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
