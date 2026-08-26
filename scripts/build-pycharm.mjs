import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pluginRoot = join(root, "pycharm-plugin");
const webviewAssets = join(root, "dist", "webview", "assets");
const pluginWebview = join(pluginRoot, "src", "main", "resources", "webview");
const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const version = packageJson.version;

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} exited with code ${result.status}`);
  }
}

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const gradle = process.platform === "win32" ? "gradlew.bat" : "./gradlew";

run(npm, ["run", "compile"], root);

mkdirSync(pluginWebview, { recursive: true });
copyFileSync(join(webviewAssets, "main.css"), join(pluginWebview, "main.css"));
copyFileSync(join(webviewAssets, "main.js"), join(pluginWebview, "main.js"));

run(gradle, ["clean", "buildPlugin", "verifyPluginProjectConfiguration"], pluginRoot);

const builtZip = join(
  pluginRoot,
  "build",
  "distributions",
  `dvs-visualizer-pycharm-${version}.zip`,
);
const releaseZip = join(root, `dvs-visualizer-pycharm-${version}.zip`);
copyFileSync(builtZip, releaseZip);

console.log(`PyCharm plugin package: ${releaseZip}`);
