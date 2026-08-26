import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (...parts) => readFileSync(join(root, ...parts), "utf8");
const packageJson = JSON.parse(read("package.json"));
const vscodeExtension = read("src", "extension.ts");
const vscodeHost = read("src", "analysis", "workspaceAnalyzer.ts");
const pycharmHost = read(
  "pycharm-plugin",
  "src",
  "main",
  "java",
  "com",
  "divex",
  "dvs",
  "DvsVisualizerPanel.java",
);
const pluginXml = read(
  "pycharm-plugin",
  "src",
  "main",
  "resources",
  "META-INF",
  "plugin.xml",
);
const gradle = read("pycharm-plugin", "build.gradle.kts");
const toolbar = read("src", "webview-app", "app", "VisualizerToolbar.tsx");
const performanceSpec = read(
  "src",
  "webview-app",
  "features",
  "logic-map",
  "logicalWorkflowPerformance.ts",
);

const sorted = (values) => [...values].sort();
const quotedValues = (source, constantName) => {
  const expression = new RegExp(
    `${constantName}\\s*=\\s*new HashSet<String>\\(Arrays\\.asList\\(([\\s\\S]*?)\\)\\);`,
  );
  const block = source.match(expression)?.[1];
  assert.ok(block, `Unable to read ${constantName}`);
  return [...block.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
};

const vscodeExtensions = vscodeHost
  .match(/\*\.\{([^}]+)\}/)?.[1]
  ?.split(",");
const vscodeExcludedDirectories = vscodeHost
  .match(/\{([^{}]+)\}\/\*\*";/)?.[1]
  ?.split(",");
assert.ok(vscodeExtensions, "Unable to read VS Code file extensions");
assert.ok(vscodeExcludedDirectories, "Unable to read VS Code exclusions");

const pycharmExtensions = quotedValues(pycharmHost, "INCLUDED_EXTENSIONS");
const pycharmExcludedDirectories = quotedValues(
  pycharmHost,
  "EXCLUDED_DIRECTORIES",
);
assert.deepEqual(sorted(vscodeExtensions), sorted(pycharmExtensions));
assert.deepEqual(
  sorted(vscodeExcludedDirectories),
  sorted(pycharmExcludedDirectories),
);

const vscodeMaxFiles =
  packageJson.contributes.configuration.properties["dvsVisualizer.maxFiles"];
const pycharmMaxFiles = Number(
  pycharmHost.match(/MAX_FILES\s*=\s*(\d+)/)?.[1],
);
assert.equal(vscodeMaxFiles.default, 5000);
assert.equal(vscodeMaxFiles.maximum, 5000);
assert.match(vscodeExtension, /maxFiles",\s*5000/);
assert.equal(pycharmMaxFiles, 5000);
assert.match(vscodeHost, /MAX_FILE_BYTES\s*=\s*2\s*\*\s*1024\s*\*\s*1024/);
assert.match(pycharmHost, /MAX_FILE_BYTES\s*=\s*2L\s*\*\s*1024L\s*\*\s*1024L/);

assert.match(gradle, new RegExp(`version\\s*=\\s*"${packageJson.version}"`));
assert.match(pluginXml, /anchor="left"/);
assert.equal(packageJson.version, "0.4.0");
assert.equal(packageJson.contributes.viewsContainers.activitybar[0].title, "DVS Visualizer");

for (const control of [
  "2D flow",
  "Logic map",
  "Vertical: top to bottom",
  "Vertical: bottom to top",
  "Horizontal: left to right",
  "Horizontal: right to left",
  "Free positioning",
  "Guided",
  "Advanced",
  "Fullscreen",
]) {
  assert.ok(toolbar.includes(control), `Missing shared UI control: ${control}`);
}

for (const budget of [
  "LARGE_GRAPH_NODE_THRESHOLD = 450",
  "LARGE_GRAPH_EDGE_THRESHOLD = 900",
  "PERFORMANCE_NODE_BUDGET = 180",
  "PERFORMANCE_EDGE_BUDGET = 320",
  "MAX_VIEWPORT_EDGES = 420",
]) {
  assert.ok(performanceSpec.includes(budget), `Missing performance spec: ${budget}`);
}

console.log(
  JSON.stringify(
    {
      status: "passed",
      version: packageJson.version,
      maxFiles: pycharmMaxFiles,
      maxFileSizeMb: 2,
      supportedExtensions: sorted(vscodeExtensions),
      excludedDirectories: sorted(vscodeExcludedDirectories),
      sharedControls: 10,
      performanceBudgets: {
        largeGraphNodes: 450,
        largeGraphEdges: 900,
        renderedNodes: 180,
        renderedEdges: 320,
        viewportEdges: 420,
      },
    },
    null,
    2,
  ),
);
