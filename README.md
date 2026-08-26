# DVS Plugin for PyCharm

DVS Plugin brings the desktop app's visualizer workspace into PyCharm. It uses
the same React map components, styling, layouts, and static-analysis pipeline
while keeping project files local.

## Features

- Use the desktop DVS 2D project map and logical workflow map.
- Expand folders and files to reveal source symbols.
- Inspect definitions, imports, calls, creates, inheritance, usage, and database
  relationships supported by the desktop analyzer.
- Switch between horizontal and vertical layouts.
- Pan, zoom, focus selections, drag cards, and reset custom positions.
- Filter logical edge types and inspect source evidence.
- Open DVS from PyCharm's left tool-window bar.

## Installation

Download the PyCharm package from the branch's matching entry on the
[GitHub Releases page](https://github.com/Jounaydh/DVS-plugin/releases).

1. Open **PyCharm → Settings → Plugins**.
2. Open the gear menu and select **Install Plugin from Disk…**.
3. Select `dvs-visualizer-pycharm-0.4.0.zip`.
4. Restart PyCharm and select **DVS** from the left tool-window bar.

On macOS, `DVS-Plugin-PyCharm-macOS-0.4.0.dmg` contains a Mac-labeled plugin
ZIP and installation instructions. Keep the ZIP compressed when selecting it.

## Build from source

Node.js and Java 17 are required:

```powershell
npm install
npm run package:pycharm
```

The package has been checked with JetBrains Plugin Verifier against platform
versions 2024.1 through 2025.2 and PyCharm 2026.2.

## Privacy

Analysis runs locally inside PyCharm. The plugin does not send workspace
contents to a server and does not execute project code.
