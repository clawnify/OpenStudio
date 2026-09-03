CREATE TABLE IF NOT EXISTS workflows (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Untitled Workflow',
  nodes TEXT NOT NULL DEFAULT '[]',
  edges TEXT NOT NULL DEFAULT '[]',
  viewport TEXT NOT NULL DEFAULT '{"x":0,"y":0,"zoom":1}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS generations (
  id TEXT PRIMARY KEY,
  workflow_id TEXT NOT NULL DEFAULT '',
  node_id TEXT NOT NULL,
  prompt TEXT NOT NULL,
  model TEXT NOT NULL,
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  error TEXT,
  run_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_generations_workflow ON generations(workflow_id);
CREATE INDEX IF NOT EXISTS idx_generations_run ON generations(run_id);

CREATE TABLE IF NOT EXISTS workflow_runs (
  id TEXT PRIMARY KEY,
  workflow_id TEXT NOT NULL,
  snapshot TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_workflow_runs_workflow ON workflow_runs(workflow_id);

-- Reusable style definitions ("lock your style once"). Referenced by style
-- nodes on the canvas and by Quick Generate; expanded into the prompt and
-- input images server-side at generation time.
CREATE TABLE IF NOT EXISTS style_presets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Untitled Style',
  instruction TEXT NOT NULL DEFAULT '',
  palette TEXT NOT NULL DEFAULT '[]',
  reference_images TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
