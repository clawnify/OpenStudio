import { useCallback, useMemo, useRef, useState, type DragEvent } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  useReactFlow,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Plus } from "lucide-react";
import { useWorkflow } from "../context";
import { useNodeTypes } from "./sidebar";
import { PromptNode } from "./nodes/prompt-node";
import { GenerateNode } from "./nodes/generate-node";
import { ImageInputNode } from "./nodes/image-input-node";
import { StyleNode } from "./nodes/style-node";
import { SubjectNode } from "./nodes/subject-node";
import { OutputNode } from "./nodes/output-node";
import { AnalyzeNode } from "./nodes/analyze-node";
import { RefineNode } from "./nodes/refine-node";
import { UpscaleNode } from "./nodes/upscale-node";

export function WorkflowCanvas() {
  const {
    nodes, edges, onNodesChange, onEdgesChange, onConnect, activeWorkflow, addNode, createWorkflow,
  } = useWorkflow();

  const nodeTypes: NodeTypes = useMemo(
    () => ({
      prompt: PromptNode as any,
      generateImage: GenerateNode as any,
      imageInput: ImageInputNode as any,
      style: StyleNode as any,
      subject: SubjectNode as any,
      output: OutputNode as any,
      analyze: AnalyzeNode as any,
      refine: RefineNode as any,
      upscale: UpscaleNode as any,
    }),
    []
  );

  const { screenToFlowPosition } = useReactFlow();
  const canvasRef = useRef<HTMLDivElement>(null);
  const nodeTypeEntries = useNodeTypes();
  const [nodeMenuOpen, setNodeMenuOpen] = useState(false);
  // Read once: the canvas only needs it to pick its opening view.
  const isPhone = useMemo(() => window.matchMedia("(max-width: 767px)").matches, []);

  // Touch has no drag and drop, so phones add a node by tap, centred in view.
  const addNodeAtCenter = useCallback((type: string) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    const center = rect
      ? screenToFlowPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
      : undefined;
    // A node's position is its top-left corner; shift by about half a node.
    addNode(type, center && { x: center.x - 110, y: center.y - 60 });
    setNodeMenuOpen(false);
  }, [addNode, screenToFlowPosition]);

  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      const type = e.dataTransfer?.getData("application/reactflow");
      if (!type) return;
      const position = screenToFlowPosition({
        x: e.clientX,
        y: e.clientY,
      });
      addNode(type, position);
    },
    [addNode, screenToFlowPosition]
  );

  if (!activeWorkflow) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center text-center max-w-sm px-6">
          <h2 className="text-base font-semibold mb-1 text-foreground">No workflow selected</h2>
          <p className="text-[13px] text-muted mb-4">Create a workflow to start building AI image-generation pipelines.</p>
          <button
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-sm text-xs font-semibold border-none cursor-pointer transition-all bg-primary text-on-primary hover:bg-primary-hover"
            onClick={createWorkflow}
          >
            <Plus className="size-3.5" /> New Workflow
          </button>
        </div>
      </div>
    );
  }

  // When a node is selected, emphasize:
  //   - any edge touching it (incoming or outgoing) — thicker stroke
  //   - source nodes feeding into it — bigger output (right) handle
  // We compute decorated copies with extra className/style; selection state
  // and event handlers continue to work against the original arrays.
  const { decoratedNodes, decoratedEdges } = useMemo(() => {
    const selectedIds = new Set(nodes.filter((n) => n.selected).map((n) => n.id));
    if (selectedIds.size === 0) return { decoratedNodes: nodes, decoratedEdges: edges };

    const sourcesOfSelection = new Set<string>();
    for (const e of edges) {
      if (selectedIds.has(e.target)) sourcesOfSelection.add(e.source);
    }

    const dn = nodes.map((n) =>
      sourcesOfSelection.has(n.id)
        ? { ...n, className: `${n.className || ""} flow-node-feeding-selection`.trim() }
        : n,
    );
    // Two passes so highlighted edges render on top of overlapping non-highlighted
    // ones: xyflow draws edges in array order, so we partition then concat with
    // touching edges last. zIndex on the edge would also work but only relative
    // to siblings in the same edge layer — order is the simpler guarantee.
    const others: typeof edges = [];
    const highlighted: typeof edges = [];
    for (const e of edges) {
      if (!selectedIds.has(e.target) && !selectedIds.has(e.source)) {
        others.push(e);
      } else {
        highlighted.push({
          ...e,
          style: { ...e.style, strokeWidth: 3.5 },
          className: `${e.className || ""} flow-edge-touching-selection`.trim(),
          zIndex: 1000,
        });
      }
    }
    const de = [...others, ...highlighted];
    return { decoratedNodes: dn, decoratedEdges: de };
  }, [nodes, edges]);

  return (
    <div ref={canvasRef} className="flex-1 relative" onDragOver={onDragOver} onDrop={onDrop}>
      <ReactFlow
        nodes={decoratedNodes}
        edges={decoratedEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        snapToGrid
        snapGrid={[16, 16]}
        defaultEdgeOptions={{ animated: true, type: "smoothstep" }}
        deleteKeyCode={["Backspace", "Delete"]}
        // A phone screen is narrower than most graphs: open on all of it.
        fitView={isPhone}
        fitViewOptions={{ maxZoom: 1, padding: 0.1 }}
      >
        <Background gap={16} size={1} />
        <Controls />

      </ReactFlow>

      <div className="md:hidden absolute top-3 left-3 z-10">
        <button
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-sm text-xs font-semibold bg-surface border border-border text-foreground shadow-sm cursor-pointer"
          aria-expanded={nodeMenuOpen}
          onClick={() => setNodeMenuOpen((o) => !o)}
        >
          <Plus className="size-3.5" /> Node
        </button>
        {nodeMenuOpen && (
          <>
            <div className="fixed inset-0" onClick={() => setNodeMenuOpen(false)} />
            <div className="absolute top-full left-0 mt-1.5 w-60 max-h-[60dvh] overflow-y-auto p-1 bg-surface border border-border rounded-md shadow-md">
              {nodeTypeEntries.map((nt) => {
                const Icon = nt.icon;
                return (
                  <button
                    key={nt.type}
                    className="flex w-full items-center gap-2.5 px-2.5 py-2 rounded-sm text-left cursor-pointer hover:bg-surface-sunken"
                    onClick={() => addNodeAtCenter(nt.type)}
                  >
                    <Icon className="size-4 shrink-0 text-muted" strokeWidth={2} />
                    <span className="flex flex-col">
                      <span className="text-xs font-semibold text-foreground">{nt.label}</span>
                      <span className="text-[11px] text-muted">{nt.desc}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
