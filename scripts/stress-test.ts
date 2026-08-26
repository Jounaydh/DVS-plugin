import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { analyzeProject } from "../src/webview-app/analysis/analyzeProject";
import { buildLogicalWorkflowGraph, LOGICAL_EDGE_KINDS } from "../src/webview-app/features/logic-map/buildLogicalWorkflowGraph";
import {
  createLogicalEdgeRoutes,
  createLogicalWorkflowLayout,
} from "../src/webview-app/features/logic-map/logicalWorkflowLayout";
import {
  filterLogicalWorkflowGraph,
  isLargeLogicalGraph,
  isUnsafeFullLogicalGraph,
  PERFORMANCE_EDGE_BUDGET,
  PERFORMANCE_NODE_BUDGET,
  scopeLogicalWorkflowGraph,
} from "../src/webview-app/features/logic-map/logicalWorkflowPerformance";
import { buildVisualGraph } from "../src/webview-app/features/project-map/buildVisualGraph";
import {
  createTwoDLayout,
  measureTwoDStage,
} from "../src/webview-app/features/project-map/twoDLayout";
import type {
  ProjectFile,
  ProjectPayload,
  WorkflowDirection,
  WorkflowPosition,
} from "../src/webview-app/types";

const requestedFiles = process.argv
  .find((argument) => argument.startsWith("--files="))
  ?.split("=")[1];
const fileCount = Number(requestedFiles ?? 5000);
assert.ok(Number.isInteger(fileCount) && fileCount >= 100, "--files must be an integer of at least 100");

const directions: WorkflowDirection[] = [
  "top-down",
  "bottom-up",
  "left-right",
  "right-left",
];
const timings: Record<string, number> = {};
const measure = <T>(label: string, operation: () => T): T => {
  const startedAt = performance.now();
  const result = operation();
  timings[label] = performance.now() - startedAt;
  return result;
};

function sourceFile(index: number): ProjectFile {
  const group = Math.floor(index / 50);
  const stem = `unit_${index}`;
  switch (index % 8) {
    case 0:
      return {
        path: `src/group_${group}/${stem}.ts`,
        content: `import { shared } from "@stress/core";\nexport class Service${index} { run(value: number) { return shared(value) + ${index}; } }\nexport function handle${index}() { return new Service${index}().run(${index}); }`,
      };
    case 1:
      return {
        path: `src/group_${group}/${stem}.js`,
        content: `import { shared } from "@stress/core";\nexport class Service${index} { run(value) { return shared(value) + ${index}; } }\nexport function handle${index}() { return new Service${index}().run(${index}); }`,
      };
    case 2:
      return {
        path: `python/group_${group}/${stem}.py`,
        content: `from stress.core import shared\n\nclass Service${index}:\n    def run(self, value):\n        return shared(value) + ${index}\n\ndef handle_${index}():\n    return Service${index}().run(${index})\n`,
      };
    case 3:
      return {
        path: `lib/group_${group}/${stem}.dart`,
        content: `import 'package:stress/core.dart';\nclass Service${index} { int run(int value) => shared(value) + ${index}; }\nint handle${index}() => Service${index}().run(${index});`,
      };
    case 4:
      return {
        path: `java/group_${group}/Service${index}.java`,
        content: `package stress.group${group};\nimport java.util.List;\nclass Service${index} { int run(int value) { return value + ${index}; } }`,
      };
    case 5:
      return {
        path: `database/group_${group}/${stem}.sql`,
        content: `CREATE TABLE stress_${index} (id INTEGER PRIMARY KEY, value TEXT NOT NULL);\nSELECT id, value FROM stress_${index} WHERE id = ${index};`,
      };
    case 6:
      return {
        path: `web/group_${group}/${stem}.html`,
        content: `<!doctype html><html><body><main id="unit-${index}"><button data-action="run-${index}">Run</button></main></body></html>`,
      };
    default:
      return {
        path: `web/group_${group}/${stem}.css`,
        content: `.unit-${index} { display: grid; color: rgb(${index % 255}, ${(index * 3) % 255}, ${(index * 7) % 255}); }`,
      };
  }
}

function assertFinitePositions(
  positions: ReadonlyMap<string, WorkflowPosition>,
  expectedSize: number,
) {
  assert.equal(positions.size, expectedSize);
  positions.forEach((position) => {
    assert.ok(Number.isFinite(position.x));
    assert.ok(Number.isFinite(position.y));
  });
}

const startedAt = performance.now();
const startingHeap = process.memoryUsage().heapUsed;
const files = Array.from({ length: fileCount }, (_, index) => sourceFile(index));
const folderSet = new Set<string>();
files.forEach((file) => {
  const parts = file.path.split("/").slice(0, -1);
  let folder = "";
  parts.forEach((part) => {
    folder = folder ? `${folder}/${part}` : part;
    folderSet.add(folder);
  });
});
const folders = [...folderSet];
const payload: ProjectPayload = {
  name: "DVS stress workspace",
  rootPath: "/stress/dvs",
  files,
  folders,
  environment: { kind: "native", platform: process.platform },
};

const project = measure("analyzeProject", () => analyzeProject(payload));
assert.equal(project.files.length, fileCount);
assert.ok(project.languages.length >= 7, "all supported stress languages should be detected");
assert.ok(project.relationshipCount > 0);

const expandedFolders = new Set(folders.map((folder) => `folder:${folder}`));
const expandedFiles = new Set(project.files.map((file) => file.id));
const visualGraph = measure("buildVisualGraph", () =>
  buildVisualGraph(project, expandedFolders, expandedFiles),
);
assert.ok(visualGraph.nodes.length > fileCount);
assert.ok(visualGraph.edges.length >= fileCount);

for (const direction of directions) {
  const layout = measure(`2d:${direction}`, () =>
    createTwoDLayout(visualGraph.nodes, direction),
  );
  assertFinitePositions(layout.positions, visualGraph.nodes.length);
  const stage = measure(`2d-stage:${direction}`, () =>
    measureTwoDStage(layout, layout.positions),
  );
  assert.ok(Number.isFinite(stage.width) && stage.width >= 980);
  assert.ok(Number.isFinite(stage.height) && stage.height >= 760);
}

const logicalGraph = measure("buildLogicalWorkflowGraph", () =>
  buildLogicalWorkflowGraph(project),
);
assert.ok(logicalGraph.nodes.length > fileCount);
assert.ok(logicalGraph.edges.length >= fileCount);

const filteredGraph = measure("filterLogicalWorkflowGraph", () =>
  filterLogicalWorkflowGraph(
    logicalGraph,
    new Set(LOGICAL_EDGE_KINDS),
    null,
  ),
);
assert.ok(isLargeLogicalGraph(filteredGraph));
if (fileCount >= 1200) assert.ok(isUnsafeFullLogicalGraph(filteredGraph));

const selectedId = filteredGraph.nodes.find((node) => node.kind === "file")?.id ?? "project";
const scopedGraph = measure("scopeLogicalWorkflowGraph", () =>
  scopeLogicalWorkflowGraph(filteredGraph, selectedId),
);
assert.ok(scopedGraph.nodes.length <= PERFORMANCE_NODE_BUDGET + 1);
assert.ok(scopedGraph.edges.length <= PERFORMANCE_EDGE_BUDGET);

for (const direction of directions) {
  const layout = measure(`logic:${direction}`, () =>
    createLogicalWorkflowLayout(scopedGraph.nodes, scopedGraph.edges, direction),
  );
  assertFinitePositions(layout.positions, scopedGraph.nodes.length);
  const routes = measure(`logic-routes:${direction}`, () =>
    createLogicalEdgeRoutes(
      scopedGraph.nodes,
      scopedGraph.edges,
      layout.positions,
      direction,
    ),
  );
  assert.ok(routes.size <= scopedGraph.edges.length);
}

const memory = process.memoryUsage();
const totalMs = performance.now() - startedAt;
assert.ok(totalMs < 120_000, `stress test exceeded 120 seconds (${totalMs.toFixed(0)} ms)`);
assert.ok(memory.heapUsed < 1_500 * 1024 * 1024, "heap usage exceeded 1.5 GB");

console.log(
  JSON.stringify(
    {
      status: "passed",
      files: fileCount,
      languages: project.languages,
      relationships: project.relationshipCount,
      twoD: { nodes: visualGraph.nodes.length, edges: visualGraph.edges.length },
      logic: {
        nodes: logicalGraph.nodes.length,
        edges: logicalGraph.edges.length,
        scopedNodes: scopedGraph.nodes.length,
        scopedEdges: scopedGraph.edges.length,
      },
      memoryMb: {
        heapDelta: Math.round((memory.heapUsed - startingHeap) / 1024 / 1024),
        heapUsed: Math.round(memory.heapUsed / 1024 / 1024),
        rss: Math.round(memory.rss / 1024 / 1024),
      },
      totalMs: Math.round(totalMs),
      timingsMs: Object.fromEntries(
        Object.entries(timings).map(([name, duration]) => [name, Math.round(duration)]),
      ),
    },
    null,
    2,
  ),
);
