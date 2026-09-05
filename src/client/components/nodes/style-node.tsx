import { useState } from "react";
import { Handle, Position } from "@xyflow/react";
import { Palette, SlidersHorizontal } from "lucide-react";
import { useWorkflow } from "../../context";
import { NodeHeader } from "./node-header";
import { NodeToolbar } from "./node-toolbar";
import { StylePresetsDialog } from "../style-presets-dialog";
import type { StyleNodeData } from "../../types";

interface Props { id: string; data: StyleNodeData; }

/**
 * Applies a saved style preset to every Generate node it feeds. The node holds
 * only the preset id — the server resolves and expands it at generation time,
 * so editing the preset restyles every workflow using it.
 */
export function StyleNode({ id, data }: Props) {
  const { updateNodeData, stylePresets } = useWorkflow();
  const [managing, setManaging] = useState(false);

  const selectClass = "w-full bg-surface-sunken border border-border rounded-sm text-foreground text-xs py-1 px-2 outline-none cursor-pointer appearance-none focus:border-ring";
  const labelClass = "text-[10px] font-semibold text-muted uppercase tracking-wide";

  const preset = stylePresets.find((p) => p.id === data.presetId);

  return (
    <div className="group flow-node relative">
      <NodeToolbar id={id} />
      <NodeHeader id={id} label={data.label} icon={Palette} />
      <div className="p-2.5 flex flex-col gap-1.5">
        <label className={labelClass}>Preset</label>
        <select
          className={selectClass}
          value={data.presetId || ""}
          onChange={(e) => updateNodeData(id, { presetId: (e.target as HTMLSelectElement).value })}
        >
          <option value="">No style</option>
          {stylePresets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        {preset ? (
          <>
            {preset.palette.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {preset.palette.map((hex) => (
                  <span key={hex} className="size-3.5 rounded-[2px] border border-border-strong" style={{ backgroundColor: hex }} title={hex} />
                ))}
              </div>
            )}
            {preset.reference_images.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {preset.reference_images.slice(0, 4).map((url) => (
                  <img key={url} src={url} alt="Style reference" className="size-8 rounded-sm object-cover border border-border" />
                ))}
              </div>
            )}
            {preset.instruction && (
              <p className="text-[10px] text-muted leading-relaxed line-clamp-3">{preset.instruction}</p>
            )}
          </>
        ) : (
          <p className="text-[10px] text-muted leading-relaxed">
            Connect this to a Generate node to apply the same look to every image it produces.
          </p>
        )}

        <button
          className="nodrag flex items-center justify-center gap-1 text-[10px] font-medium text-muted hover:text-foreground border border-border rounded-sm px-1.5 py-1 cursor-pointer transition-colors"
          onClick={() => setManaging(true)}
        >
          <SlidersHorizontal className="size-3" />
          Manage styles
        </button>
      </div>
      <Handle type="source" position={Position.Right} className="!bg-ring" />

      <StylePresetsDialog
        open={managing}
        onOpenChange={setManaging}
        onSaved={(presetId) => updateNodeData(id, { presetId })}
      />
    </div>
  );
}
