import * as path from "node:path";
import * as vscode from "vscode";

export interface ProjectFilePayload {
  path: string;
  content: string;
}

export interface WorkspacePayload {
  name: string;
  rootPath: string;
  files: ProjectFilePayload[];
  folders: string[];
  environment: { kind: "native"; platform: string };
  loadSummary: {
    totalFiles: number;
    cachedFiles: number;
    readFiles: number;
    durationMs: number;
  };
  truncated: boolean;
}

const INCLUDE_GLOB =
  "**/*.{ts,tsx,js,jsx,mjs,cjs,py,pyw,dart,java,html,htm,css,sql,json,yaml,yml,md,xml,toml,properties,gradle}";
const EXCLUDE_GLOB =
  "**/{.git,node_modules,dist,build,out,target,coverage,.venv,venv,__pycache__,.dart_tool,.gradle,.idea,.next,.cache}/**";
const MAX_FILE_BYTES = 2 * 1024 * 1024;

function normalize(value: string) {
  return value.replaceAll("\\", "/").replace(/\/{2,}/g, "/").replace(/^\.\//, "");
}

function folderPaths(files: ProjectFilePayload[]) {
  const folders = new Set<string>();
  for (const file of files) {
    const parts = file.path.split("/");
    parts.pop();
    let current = "";
    for (const part of parts) {
      current = current ? `${current}/${part}` : part;
      folders.add(current);
    }
  }
  return [...folders].sort((left, right) => left.localeCompare(right));
}

export async function loadWorkspacePayload(
  workspaceFolders: readonly vscode.WorkspaceFolder[],
  maxFiles: number,
): Promise<WorkspacePayload> {
  const startedAt = Date.now();
  const files: ProjectFilePayload[] = [];
  let truncated = false;

  for (const folder of workspaceFolders) {
    const remaining = Math.max(0, maxFiles - files.length);
    if (remaining === 0) {
      truncated = true;
      break;
    }
    const uris = await vscode.workspace.findFiles(
      new vscode.RelativePattern(folder, INCLUDE_GLOB),
      EXCLUDE_GLOB,
      remaining + 1,
    );
    if (uris.length > remaining) truncated = true;

    for (const uri of uris.slice(0, remaining)) {
      try {
        const stat = await vscode.workspace.fs.stat(uri);
        if (stat.size > MAX_FILE_BYTES) continue;
        const bytes = await vscode.workspace.fs.readFile(uri);
        const relativePath = normalize(path.relative(folder.uri.fsPath, uri.fsPath));
        const projectPath =
          workspaceFolders.length === 1
            ? relativePath
            : `${folder.name}/${relativePath}`;
        files.push({
          path: projectPath,
          content: new TextDecoder("utf-8").decode(bytes),
        });
      } catch {
        // A file can disappear or become unreadable while a workspace scan runs.
      }
    }
  }

  files.sort((left, right) => left.path.localeCompare(right.path));
  const name =
    workspaceFolders.length === 1
      ? workspaceFolders[0].name
      : workspaceFolders.map((folder) => folder.name).join(" + ");

  return {
    name,
    rootPath:
      workspaceFolders.length === 1
        ? workspaceFolders[0].uri.fsPath
        : "vscode://workspace",
    files,
    folders: folderPaths(files),
    environment: { kind: "native", platform: process.platform },
    loadSummary: {
      totalFiles: files.length,
      cachedFiles: 0,
      readFiles: files.length,
      durationMs: Date.now() - startedAt,
    },
    truncated,
  };
}

export function workspaceUriForProjectPath(projectPath: string) {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders?.length) return undefined;
  const normalized = normalize(projectPath);

  if (folders.length === 1) {
    return vscode.Uri.joinPath(folders[0].uri, ...normalized.split("/"));
  }

  const [folderName, ...parts] = normalized.split("/");
  const folder = folders.find((candidate) => candidate.name === folderName);
  return folder ? vscode.Uri.joinPath(folder.uri, ...parts) : undefined;
}
