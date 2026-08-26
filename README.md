# DVS Plugin

DVS Plugin brings the desktop app's visualizer workspace into Visual Studio Code
and PyCharm. It uses the same React map components, styling, layouts, and
static-analysis pipeline while keeping project files local.

## Features

- Use the desktop DVS 2D project map and logical workflow map.
- Expand folders and files to reveal source symbols.
- Inspect definitions, imports, calls, creates, inheritance, usage, and database
  relationships supported by the desktop analyzer.
- Change flow direction: top-down, bottom-up, left-to-right, or right-to-left.
- Pan, zoom, focus selections, drag cards with Free Positioning, and reset custom
  positions.
- Switch between Guided and Advanced modes.
- Filter logical edge types, focus selected connections, and inspect source
  evidence for supported relationships.
- Open evidence locations directly in the VS Code editor.
- Refresh analysis from the Activity Bar or Command Palette.

## Use

1. Open a project folder in Visual Studio Code.
2. Open the Command Palette.
3. Run **DVS: Open Workspace Visualizer**.

Quick access is also available from the DVS icon in the Activity Bar, the
`DVS Map` status-bar item, or these shortcuts:

- `Ctrl+Alt+D` (`Cmd+Alt+D` on macOS): open the 2D Map.
- `Ctrl+Alt+L` (`Cmd+Alt+L` on macOS): open the Logic Map.

The DVS icon and **Maps & Controls** view are registered in the left Activity
Bar. DVS reveals the sidebar once after installation so it is easy to find,
then respects your normal VS Code sidebar choices.

Supported source files include TypeScript, JavaScript, Python, Dart, Java,
HTML, CSS, SQL, JSON, and YAML.

VS Code and PyCharm use the same 5,000-file scan limit, 2 MB per-file limit,
supported file extensions, excluded build/cache folders, visualizer controls,
and map performance budgets.

## Local installation

Prebuilt VS Code and PyCharm packages are attached to the matching entry on the
[GitHub Releases page](https://github.com/Jounaydh/DVS-plugin/releases).

Build the VSIX:

```powershell
npm install
npm run package:vsix
```

Then run **Extensions: Install from VSIX...** in Visual Studio Code and select
the generated `dvs-visualizer-0.4.0.vsix` file. Windows users can instead run
`DVS-Visualizer-VSCode-Setup-0.4.0.exe`.

On macOS, open `DVS-Plugin-VSCode-macOS-0.4.0.dmg` and launch **Install DVS
Plugin**. Because this development build is unsigned, macOS may require
Control-clicking the app and choosing **Open** the first time.

## PyCharm installation

The separate `dvs-visualizer-pycharm-0.4.0.zip` package adds **DVS** to
PyCharm's left tool-window bar:

1. Open **Settings → Plugins** in PyCharm.
2. Open the gear menu and choose **Install Plugin from Disk…**.
3. Select `dvs-visualizer-pycharm-0.4.0.zip`.
4. Open **DVS** from the left tool-window bar.

The package has been checked with JetBrains Plugin Verifier against platform
versions 2024.1 through 2025.2 and PyCharm 2026.2.

Build the PyCharm package from source (Node.js and Java 17 are required):

```powershell
npm install
npm run package:pycharm
```

To build all three v0.4.0 Windows release files in one command:

```powershell
npm run package:release
```

## Privacy

Analysis runs locally inside the IDE. The plugins do not send workspace contents
to a server.

## Analysis scope

The extension uses static source inspection and does not execute project code.
Its supported symbols and relationships match the copied desktop visualizer
analysis modules.

## Verification

Run the type checks and the maximum-size synthetic workspace stress test:

```powershell
npm run check
npm run test:stress
```

The stress test exercises 5,000 mixed-language files through analysis, the 2D
map, all four layout directions, the logic graph, performance scoping, and edge
routing.
