import { Component, useEffect, useMemo, useState } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { analyzeProject } from "./analysis/analyzeProject";
import { VisualizerToolbar } from "./app/VisualizerToolbar";
import { LogicalWorkflowVisualizer } from "./features/logic-map/LogicalWorkflowVisualizer";
import { TwoDVisualizer } from "./features/project-map/TwoDVisualizer";
import type {
  AnalyzedProject,
  ExperienceMode,
  ProjectPayload,
  ViewMode,
  VisualNode,
  WorkflowDirection,
  WorkflowPosition,
} from "./types";

interface VsCodeApi {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
}

declare function acquireVsCodeApi(): VsCodeApi;

const vscode = acquireVsCodeApi();

type HostMessage =
  | {
      type: "configure";
      viewMode?: ViewMode;
      direction?: WorkflowDirection;
    }
  | { type: "workspace"; payload: ProjectPayload }
  | { type: "loading" }
  | { type: "error"; message: string };

interface ErrorBoundaryProps {
  children: ReactNode;
  onRetry: () => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

class VisualizerErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("DVS visualizer failed", error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="workspace-loading dvs-error-state">
        <strong>The visualizer could not render this project</strong>
        <span>{this.state.error.message}</span>
        <button
          type="button"
          onClick={() => {
            this.setState({ error: null });
            this.props.onRetry();
          }}
        >
          <RefreshCw size={14} />
          Analyze again
        </button>
      </div>
    );
  }
}

function LoadingWorkspace({ message }: { message: string }) {
  return (
    <div className="workspace-loading">
      <div className="dvs-loading-ring" />
      <strong>{message}</strong>
      <span>Building the same project and logic maps used by DVS</span>
    </div>
  );
}

export function VisualizerApp() {
  const [payload, setPayload] = useState<ProjectPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("2d");
  const [experienceMode, setExperienceMode] =
    useState<ExperienceMode>("beginner");
  const [workflowDirection, setWorkflowDirection] =
    useState<WorkflowDirection>("top-down");
  const [freePositioning, setFreePositioning] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<VisualNode | null>(null);
  const [expandedFolders, setExpandedFolders] = useState(
    () => new Set<string>(["folder:lib"]),
  );
  const [expandedFiles, setExpandedFiles] = useState(
    () => new Set<string>(),
  );
  const [twoDZoom, setTwoDZoom] = useState(1.4);
  const [logicZoom, setLogicZoom] = useState(0.8);
  const [twoDPositions, setTwoDPositions] = useState<
    Record<string, WorkflowPosition>
  >({});
  const [logicPositions, setLogicPositions] = useState<
    Record<string, WorkflowPosition>
  >({});

  const project = useMemo<AnalyzedProject | null>(() => {
    if (!payload) return null;
    return analyzeProject(payload);
  }, [payload]);

  useEffect(() => {
    const receiveMessage = (event: MessageEvent<HostMessage>) => {
      const message = event.data;
      if (message.type === "configure") {
        if (message.viewMode) setViewMode(message.viewMode);
        if (message.direction) setWorkflowDirection(message.direction);
        return;
      }
      if (message.type === "loading") {
        setLoading(true);
        setError(null);
        return;
      }
      if (message.type === "error") {
        setLoading(false);
        setError(message.message);
        return;
      }
      if (message.type === "workspace") {
        setPayload(message.payload);
        setSelectedNode(null);
        setLoading(false);
        setError(null);
      }
    };
    const fullscreenChanged = () =>
      setIsFullscreen(Boolean(document.fullscreenElement));

    window.addEventListener("message", receiveMessage);
    document.addEventListener("fullscreenchange", fullscreenChanged);
    vscode.postMessage({ type: "ready" });
    return () => {
      window.removeEventListener("message", receiveMessage);
      document.removeEventListener("fullscreenchange", fullscreenChanged);
    };
  }, []);

  const toggleFolder = (id: string) => {
    setExpandedFolders((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleFile = (id: string) => {
    setExpandedFiles((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const resetActivePositions = () => {
    if (viewMode === "logic") setLogicPositions({});
    else setTwoDPositions({});
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      setIsFullscreen((current) => !current);
    }
  };

  if (loading || !project) {
    return (
      <section className="visualizer-area">
        {error ? (
          <div className="workspace-loading dvs-error-state">
            <strong>Unable to load this workspace</strong>
            <span>{error}</span>
            <button
              type="button"
              onClick={() => vscode.postMessage({ type: "refresh" })}
            >
              <RefreshCw size={14} />
              Try again
            </button>
          </div>
        ) : (
          <LoadingWorkspace message="Analyzing workspace…" />
        )}
      </section>
    );
  }

  const selectedId = selectedNode?.id ?? null;
  const activePositions =
    viewMode === "logic" ? logicPositions : twoDPositions;

  return (
    <section
      className={`visualizer-area ${isFullscreen ? "is-fullscreen" : ""}`}
    >
      <VisualizerToolbar
        viewMode={viewMode}
        showCode={false}
        relationshipCount={project.relationshipCount}
        experienceMode={experienceMode}
        workflowDirection={workflowDirection}
        freePositioning={freePositioning}
        hasCustomPositions={Object.keys(activePositions).length > 0}
        isFullscreen={isFullscreen}
        onViewModeChange={setViewMode}
        onExperienceModeChange={setExperienceMode}
        onWorkflowDirectionChange={setWorkflowDirection}
        onToggleFreePositioning={() =>
          setFreePositioning((current) => !current)
        }
        onResetCustomPositions={resetActivePositions}
        onToggleFullscreen={() => void toggleFullscreen()}
      />

      <div className="visualizer-canvas">
        <VisualizerErrorBoundary
          onRetry={() => vscode.postMessage({ type: "refresh" })}
        >
          {viewMode === "logic" ? (
            <LogicalWorkflowVisualizer
              project={project}
              selectedId={selectedId}
              zoom={logicZoom}
              direction={workflowDirection}
              freePositioning={freePositioning}
              customPositions={logicPositions}
              onZoomChange={setLogicZoom}
              onCustomPositionsChange={setLogicPositions}
              onSelectNode={setSelectedNode}
              onOpenEvidenceLocation={(path, line) =>
                vscode.postMessage({ type: "openSource", path, line })
              }
            />
          ) : (
            <TwoDVisualizer
              project={project}
              expandedFolders={expandedFolders}
              expandedFiles={expandedFiles}
              selectedId={selectedId}
              zoom={twoDZoom}
              direction={workflowDirection}
              freePositioning={freePositioning}
              customPositions={twoDPositions}
              onZoomChange={setTwoDZoom}
              onCustomPositionsChange={setTwoDPositions}
              onSelectNode={setSelectedNode}
              onToggleFolder={toggleFolder}
              onToggleFile={toggleFile}
            />
          )}
        </VisualizerErrorBoundary>

        {viewMode === "logic" && (
          <div className="canvas-help">
            <span>Arrows show the direction code flows</span>
            <span>Select a card to isolate its direct links</span>
          </div>
        )}
        {viewMode === "2d" && (
          <div className="graph-legend">
            <span>
              <i className="line-solid" /> Contains
            </span>
            <span>
              <i className="line-dashed" /> Imports
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
