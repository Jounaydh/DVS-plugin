import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (...parts) => readFileSync(join(root, ...parts), "utf8");
const packageJson = JSON.parse(read("package.json"));
const extension = read("src", "extension.ts");

const container = packageJson.contributes.viewsContainers.activitybar.find(
  ({ id }) => id === "dvsVisualizer",
);
assert.ok(container, "DVS must contribute an Activity Bar container");
assert.equal(container.title, "DVS Visualizer");
assert.equal(container.icon, "media/dvs-view.svg");
assert.ok(
  existsSync(join(root, container.icon)),
  "The Activity Bar icon must be included in the extension",
);

const quickAccessView = packageJson.contributes.views.dvsVisualizer.find(
  ({ id }) => id === "dvsVisualizer.quickAccess",
);
assert.ok(quickAccessView, "The DVS container must include its quick-access view");
assert.equal(quickAccessView.visibility, "visible");
assert.ok(packageJson.activationEvents.includes("onStartupFinished"));
assert.ok(
  packageJson.activationEvents.includes("onView:dvsVisualizer.quickAccess"),
);
assert.match(
  extension,
  /registerTreeDataProvider\(\s*["']dvsVisualizer\.quickAccess["']/,
);
assert.match(
  extension,
  /executeCommand\(\s*["']workbench\.view\.extension\.dvsVisualizer["']/,
);
assert.match(extension, /dvsVisualizer\.sidebarRevealed\.v0\.4\.0/);

console.log(
  JSON.stringify(
    {
      status: "passed",
      activityBarContainer: container.id,
      view: quickAccessView.id,
      icon: container.icon,
      firstRunReveal: true,
    },
    null,
    2,
  ),
);
