import { useState } from "react";
import { Handle, Position } from "@xyflow/react";
import { UserRound, SlidersHorizontal } from "lucide-react";
import { useWorkflow } from "../../context";
import { NodeHeader } from "./node-header";
import { NodeToolbar } from "./node-toolbar";
import { StylePresetsDialog } from "../style-presets-dialog";
import type { SubjectNodeData } from "../../types";

interface Props { id: string; data: SubjectNodeData; }

/**
 * Locks a saved subject — a character, a product, a mascot — onto every Generate
 * node it feeds, so the same face or packshot survives a whole batch. Holds only
 * the preset id; editing the preset re-locks every workflow using it.
 */
export function SubjectNode({ id, data }: Props) {
  const { updateNodeData, stylePresets } = useWorkflow();
  const [managing, setManaging] = useState(false);

  const selectClass = "w-full bg-surface-sunken border border-border rounded-sm text-foreground text-xs py-1 px-2 outline-none cursor-pointer appearance-none focus:border-ring";
  const labelClass = "text-[10px] font-semibold text-muted uppercase tracking-wide";

  const subjects = stylePresets.filter((p) => p.kind === "subject");
  const preset = subjects.find((p) => p.id === data.presetId);

  return (
    <div className="group flow-node relative">
      <NodeToolbar id={id} />
      <NodeHeader id={id} label={data.label} icon={UserRound} />
      <div className="p-2.5 flex flex-col gap-1.5">
        <label className={labelClass}>Subject</label>
        <select
          className={selectClass}
          value={data.presetId || ""}
          onChange={(e) => updateNodeData(id, { presetId: (e.target as HTMLSelectElement).value })}
        >
          <option value="">No subject</option>
          {subjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        {preset ? (
          <>
            {preset.reference_images.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {preset.reference_images.slice(0, 4).map((url) => (
                  <img key={url} src={url} alt="Subject reference" className="size-10 rounded-sm object-cover border border-border" />
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-amber-500 leading-relaxed">
                No reference images — identity can't be held from text alone. Add one or two in Manage.
              </p>
            )}
            {preset.instruction && (
              <p className="text-[10px] text-muted leading-relaxed line-clamp-3">{preset.instruction}</p>
            )}
          </>
        ) : (
          <p className="text-[10px] text-muted leading-relaxed">
            Lock a character or product once, then vary the scene around it. Connect this to a Generate node.
          </p>
        )}

        <button
          className="nodrag flex items-center justify-center gap-1 text-[10px] font-medium text-muted hover:text-foreground border border-border rounded-sm px-1.5 py-1 cursor-pointer transition-colors"
          onClick={() => setManaging(true)}
        >
          <SlidersHorizontal className="size-3" />
          Manage subjects
        </button>
      </div>
      <Handle type="source" position={Position.Right} className="!bg-ring" />

      <StylePresetsDialog
        open={managing}
        onOpenChange={setManaging}
        kind="subject"
        onSaved={(presetId) => updateNodeData(id, { presetId })}
      />
    </div>
  );
}
