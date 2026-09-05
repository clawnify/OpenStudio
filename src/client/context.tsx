import { createContext, useContext } from "react";
import type { Workflow, ModelOption, Generation, StylePreset } from "./types";
import type { CostUnit } from "./cost";
import type { Node, Edge, Viewport } from "@xyflow/react";

export interface Features {
  openrouter: boolean;
  openai: boolean;
  fal: boolean;
  anthropic: boolean;
  /** Unit generation cost is displayed in — "credits" on Clawnify, "usd" self-hosted. */
  costUnit: CostUnit;
}

export interface LeafResult {
  nodeId: string;
  label: string;
  type: string;
  imageUrl?: string;
  imageUrls?: string[];
  text?: string;
}

export interface WorkflowContextValue {
  // Workflow list
  workflows: Workflow[];
  activeWorkflow: Workflow | null;
  createWorkflow: () => Promise<Workflow | undefined>;
  selectWorkflow: (id: string) => Promise<void>;
  deleteWorkflow: (id: string) => Promise<void>;
  renameWorkflow: (id: string, name: string) => Promise<void>;
  duplicateWorkflow: (id: string) => Promise<void>;

  // Flow state
  nodes: Node[];
  edges: Edge[];
  onNodesChange: (changes: any) => void;
  onEdgesChange: (changes: any) => void;
  onConnect: (connection: any) => void;
  addNode: (type: string, position?: { x: number; y: number }) => void;
  updateNodeData: (nodeId: string, data: Partial<any>) => void;
  deleteNode: (nodeId: string) => void;
  saveWorkflow: () => Promise<void>;

  // Execution
  executeWorkflow: () => Promise<void>;
  runNode: (nodeId: string) => Promise<void>;
  executing: boolean;

  /** Outputs from the most recent execution — one entry per leaf node (no outgoing edges). */
  lastRunResults: LeafResult[];
  setLastRunResults: (r: LeafResult[]) => void;

  // Models
  models: ModelOption[];

  // Which providers/features are available based on configured env keys.
  features: Features;

  // Style presets — reusable "lock your style once" definitions, shared by
  // the canvas style node and Quick Generate.
  stylePresets: StylePreset[];
  refreshStylePresets: () => Promise<void>;
  /** Create (no id) or update (id) a preset. Returns the saved row, or undefined on failure. */
  saveStylePreset: (
    preset: Pick<StylePreset, "name" | "instruction" | "palette" | "reference_images"> & { id?: string },
  ) => Promise<StylePreset | undefined>;
  deleteStylePreset: (id: string) => Promise<void>;

  // Generations
  generations: Generation[];
  refreshGenerations: () => Promise<void>;
  /** Delete a generation row + its R2 blob (if owned). Optimistic. */
  deleteGeneration: (id: string) => Promise<void>;
  /** Load a workflow_runs snapshot into the canvas — does not auto-save. */
  loadRun: (runId: string) => Promise<void>;
  /**
   * Load a past run, apply feedback text to the named GenerateImage node, and
   * re-run only that node against the loaded snapshot. Used by the Outputs
   * section's Feedback flow.
   */
  runOutputFeedback: (runId: string, nodeId: string, feedback: string) => Promise<void>;

  // Agent mode
  isAgent: boolean;

  // State
  loading: boolean;
  error: string | null;
  clearError: () => void;
}

export const WorkflowContext = createContext<WorkflowContextValue>(null!);

export function useWorkflow() {
  return useContext(WorkflowContext);
}
