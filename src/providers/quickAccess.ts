import * as vscode from "vscode";

interface QuickAction {
  label: string;
  description: string;
  command: string;
  icon: string;
}

const ACTIONS: QuickAction[] = [
  {
    label: "2D Project Map",
    description: "Open the full DVS workspace flow",
    command: "dvsVisualizer.open2d",
    icon: "type-hierarchy",
  },
  {
    label: "Logical Workflow Map",
    description: "Inspect relationships and evidence",
    command: "dvsVisualizer.openLogic",
    icon: "git-compare",
  },
  {
    label: "Flow Left to Right",
    description: "Open DVS with a horizontal layout",
    command: "dvsVisualizer.horizontal",
    icon: "arrow-right",
  },
  {
    label: "Flow Top to Bottom",
    description: "Open DVS with a vertical layout",
    command: "dvsVisualizer.vertical",
    icon: "arrow-down",
  },
  {
    label: "Refresh Workspace",
    description: "Reanalyze the current project",
    command: "dvsVisualizer.refresh",
    icon: "refresh",
  },
];

export class DvsQuickAccessProvider
  implements vscode.TreeDataProvider<QuickAction>
{
  getTreeItem(action: QuickAction) {
    const item = new vscode.TreeItem(
      action.label,
      vscode.TreeItemCollapsibleState.None,
    );
    item.description = action.description;
    item.iconPath = new vscode.ThemeIcon(action.icon);
    item.command = {
      command: action.command,
      title: action.label,
    };
    item.tooltip = `${action.label} — ${action.description}`;
    return item;
  }

  getChildren() {
    return ACTIONS;
  }
}
