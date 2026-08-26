# DVS Visualizer for PyCharm

This JetBrains Platform plugin places **DVS** on PyCharm's left tool-window bar.
It bundles the same React/CSS 2D and logical workflow visualizer used by the DVS
desktop app and VS Code extension.

## Install

1. In PyCharm, open **Settings → Plugins**.
2. Select the gear menu and **Install Plugin from Disk…**.
3. Choose `dvs-visualizer-pycharm-0.4.0.zip`.
4. Restart PyCharm and select **DVS** from the left tool-window bar.

The plugin reads supported project files locally and never uploads source code.
It requires a normal JetBrains Runtime build with JCEF enabled.
