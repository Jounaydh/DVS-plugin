import * as vscode from "vscode";
import {
  loadWorkspacePayload,
  type WorkspacePayload,
  workspaceUriForProjectPath,
} from "./analysis/workspaceAnalyzer";
import { DvsQuickAccessProvider } from "./providers/quickAccess";
import { panelHtml } from "./webview/panelHtml";

type MapMode = "2d" | "logic";
type WorkflowDirection =
  | "top-down"
  | "bottom-up"
  | "left-right"
  | "right-left";

let activePanel: DvsVisualizerPanel | undefined;
const SIDEBAR_REVEALED_KEY = "dvsVisualizer.sidebarRevealed.v0.4.0";

async function revealSidebarOnFirstRun(context: vscode.ExtensionContext) {
  if (context.globalState.get<boolean>(SIDEBAR_REVEALED_KEY)) return;

  try {
    await vscode.commands.executeCommand(
      "workbench.view.extension.dvsVisualizer",
    );
    await context.globalState.update(SIDEBAR_REVEALED_KEY, true);
  } catch {
    // Leave the flag unset so VS Code can try again on its next startup.
  }
}

export function activate(context: vscode.ExtensionContext) {
  const quickAccess = new DvsQuickAccessProvider();
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider(
      "dvsVisualizer.quickAccess",
      quickAccess,
    ),
  );

  const show = (mode: MapMode) => {
    const { panel, created } = DvsVisualizerPanel.createOrShow(
      context.extensionUri,
      mode,
    );
    panel.configure({ viewMode: mode });
    if (created) void panel.refresh();
  };

  const orient = (direction: WorkflowDirection) => {
    const { panel, created } = DvsVisualizerPanel.createOrShow(
      context.extensionUri,
      "2d",
    );
    panel.configure({ direction });
    if (created) void panel.refresh();
  };

  context.subscriptions.push(
    vscode.commands.registerCommand("dvsVisualizer.open", () => show("2d")),
    vscode.commands.registerCommand("dvsVisualizer.open2d", () => show("2d")),
    vscode.commands.registerCommand("dvsVisualizer.openLogic", () =>
      show("logic"),
    ),
    vscode.commands.registerCommand("dvsVisualizer.horizontal", () =>
      orient("left-right"),
    ),
    vscode.commands.registerCommand("dvsVisualizer.vertical", () =>
      orient("top-down"),
    ),
    vscode.commands.registerCommand("dvsVisualizer.refresh", () => {
      const { panel } = DvsVisualizerPanel.createOrShow(
        context.extensionUri,
        "2d",
      );
      void panel.refresh();
    }),
  );

  const statusBar = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    25,
  );
  statusBar.text = "$(type-hierarchy) DVS Map";
  statusBar.tooltip = "Open the DVS workspace visualizer";
  statusBar.command = "dvsVisualizer.open2d";
  statusBar.show();
  context.subscriptions.push(statusBar);

  void revealSidebarOnFirstRun(context);
}

export function deactivate() {
  activePanel = undefined;
}

class DvsVisualizerPanel {
  private payload: WorkspacePayload | undefined;
  private viewMode: MapMode;
  private direction: WorkflowDirection = "left-right";
  private ready = false;
  private readonly disposables: vscode.Disposable[] = [];

  static createOrShow(extensionUri: vscode.Uri, mode: MapMode) {
    if (activePanel) {
      activePanel.panel.reveal(vscode.ViewColumn.Active);
      return { panel: activePanel, created: false };
    }
    const panel = vscode.window.createWebviewPanel(
      "dvsVisualizer",
      mode === "2d" ? "DVS 2D Map" : "DVS Logic Map",
      vscode.ViewColumn.Active,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, "dist", "webview"),
          vscode.Uri.joinPath(extensionUri, "media"),
        ],
      },
    );
    activePanel = new DvsVisualizerPanel(panel, extensionUri, mode);
    return { panel: activePanel, created: true };
  }

  private constructor(
    readonly panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    initialMode: MapMode,
  ) {
    this.viewMode = initialMode;
    panel.iconPath = vscode.Uri.joinPath(extensionUri, "media", "icon.png");
    panel.webview.html = panelHtml(panel.webview, extensionUri);
    panel.onDidDispose(() => this.dispose(), null, this.disposables);
    panel.webview.onDidReceiveMessage(
      async (message: {
        type?: string;
        path?: string;
        line?: number;
      }) => {
        if (message.type === "ready") {
          this.ready = true;
          await this.sendConfiguration();
          if (this.payload) await this.sendWorkspace();
          return;
        }
        if (message.type === "refresh") {
          await this.refresh();
          return;
        }
        if (message.type === "openSource" && message.path) {
          await this.openSource(message.path, message.line ?? 1);
        }
      },
      null,
      this.disposables,
    );
  }

  configure(configuration: {
    viewMode?: MapMode;
    direction?: WorkflowDirection;
  }) {
    if (configuration.viewMode) this.viewMode = configuration.viewMode;
    if (configuration.direction) this.direction = configuration.direction;
    this.panel.title =
      this.viewMode === "2d" ? "DVS 2D Map" : "DVS Logic Map";
    if (this.ready) void this.sendConfiguration();
  }

  async refresh() {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders?.length) {
      await this.panel.webview.postMessage({
        type: "error",
        message: "Open a project folder before starting DVS Visualizer.",
      });
      return;
    }
    await vscode.commands.executeCommand(
      "setContext",
      "dvsVisualizer.active",
      true,
    );
    await this.panel.webview.postMessage({ type: "loading" });
    try {
      const configuredLimit = vscode.workspace
        .getConfiguration("dvsVisualizer")
        .get<number>("maxFiles", 5000);
      this.payload = await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Window,
          title: "DVS is analyzing the workspace",
        },
        () => loadWorkspacePayload(folders, configuredLimit),
      );
      await this.sendWorkspace();
    } catch (error) {
      await this.panel.webview.postMessage({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Workspace analysis failed.",
      });
    }
  }

  private sendConfiguration() {
    return this.panel.webview.postMessage({
      type: "configure",
      viewMode: this.viewMode,
      direction: this.direction,
    });
  }

  private sendWorkspace() {
    return this.panel.webview.postMessage({
      type: "workspace",
      payload: this.payload,
    });
  }

  private async openSource(projectPath: string, lineNumber: number) {
    const uri = workspaceUriForProjectPath(projectPath);
    if (!uri) return;
    try {
      const document = await vscode.workspace.openTextDocument(uri);
      const line = Math.max(0, Math.min(document.lineCount - 1, lineNumber - 1));
      const range = new vscode.Range(line, 0, line, 0);
      const editor = await vscode.window.showTextDocument(document, {
        viewColumn: vscode.ViewColumn.One,
        selection: range,
        preserveFocus: false,
      });
      editor.revealRange(
        range,
        vscode.TextEditorRevealType.InCenterIfOutsideViewport,
      );
    } catch (error) {
      void vscode.window.showErrorMessage(
        `DVS could not open ${projectPath}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private dispose() {
    activePanel = undefined;
    void vscode.commands.executeCommand(
      "setContext",
      "dvsVisualizer.active",
      false,
    );
    while (this.disposables.length) this.disposables.pop()?.dispose();
  }
}
