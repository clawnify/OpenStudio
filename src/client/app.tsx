import { useEffect } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { BrowserRouter, Routes, Route, Navigate, NavLink, useLocation, useNavigate } from "react-router-dom";
import { AppNav, embedded, reportLocation } from "@clawnify/app/client";
import { WorkflowContext, useWorkflow } from "./context";
import { useWorkflowState } from "./hooks/use-workflow";
import { WorkflowEditor } from "./components/workflow-editor";
import { WorkflowsList } from "./components/workflows-list";
import { QuickGenerate } from "./components/quick-generate";

function TopNav() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `px-5 py-2.5 border-b-2 text-[13px] font-medium cursor-pointer transition-all ${
      isActive
        ? "text-foreground border-foreground"
        : "text-muted border-transparent hover:text-foreground"
    }`;
  return (
    <nav className="flex bg-surface border-b border-border px-3 shrink-0">
      <NavLink to="/generate" className={linkClass}>Generate</NavLink>
      <NavLink to="/workflows" className={linkClass}>Workflows</NavLink>
    </nav>
  );
}

/**
 * Inside the Clawnify dashboard the app's pages live in the dashboard sidebar,
 * and the open screen is kept in the host URL so a reload returns to it.
 */
function HostNav() {
  const { workflows } = useWorkflow();
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    reportLocation(location.pathname + location.search);
  }, [location.pathname, location.search]);
  const workflowId = location.pathname.match(/^\/workflows\/([^/]+)/)?.[1];
  const active = workflowId ?? (location.pathname.startsWith("/workflows") ? "workflows" : "generate");
  return (
    <AppNav
      title="Studio"
      icon="sparkles"
      active={active}
      groups={[
        {
          items: [
            { id: "generate", label: "Generate", icon: "sparkles", href: "/generate", home: true },
            { id: "workflows", label: "Workflows", icon: "layers", href: "/workflows" },
          ],
        },
        {
          label: "Recent workflows",
          items: workflows.slice(0, 8).map((w) => ({ id: w.id, label: w.name, icon: "zap", href: `/workflows/${w.id}` })),
        },
      ]}
      onNavigate={(item) => item.href && navigate(item.href)}
    />
  );
}

export function App() {
  const state = useWorkflowState();

  if (state.loading) {
    return (
      <div className="flex items-center justify-center h-full text-muted text-sm">
        Loading...
      </div>
    );
  }

  return (
    <WorkflowContext.Provider value={state}>
      <ReactFlowProvider>
        <BrowserRouter>
          <div className="flex flex-col h-full w-full">
            {embedded ? <HostNav /> : <TopNav />}
            <div className="flex-1 min-h-0 flex flex-col">
              <Routes>
                <Route path="/" element={<Navigate to="/generate" replace />} />
                <Route path="/generate" element={<QuickGenerate />} />
                <Route path="/workflows" element={<WorkflowsList />} />
                <Route path="/workflows/:id" element={<WorkflowEditor />} />
                <Route path="*" element={<Navigate to="/generate" replace />} />
              </Routes>
            </div>
          </div>
        </BrowserRouter>
      </ReactFlowProvider>
    </WorkflowContext.Provider>
  );
}
