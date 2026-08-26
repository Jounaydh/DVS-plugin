# DVS Visualizer: Windows installation and first use

This guide installs DVS Visualizer `0.4.0` in Visual Studio Code and sets it up
the same way as the verified development installation: the **DVS Visualizer**
icon appears in the left Activity Bar beside tools such as Explorer and Codex,
the **Maps & Controls** sidebar opens, and the full 2D and Logic maps run in an
editor tab.

## Requirements

- Windows 10 or Windows 11.
- Visual Studio Code 1.95 or newer. Use the standard stable VS Code installation
  for the simplest installer experience.
- A project folder containing supported source files.
- No administrator account is required for a normal per-user VS Code install.

The extension analyzes files locally. It does not upload your project or run
your project code.

## Recommended installation: Windows setup program

1. Open the
   [DVS Plugin 0.4.0 VS Code release](https://github.com/Jounaydh/DVS-plugin/releases/tag/v0.4.0-vscode).
2. Download `DVS-Visualizer-VSCode-Setup-0.4.0.exe` from **Assets**.
3. Run the downloaded setup program.
4. Wait for **Installed successfully** and select **Done**.
5. Open Visual Studio Code. If it was already open during installation, open
   the Command Palette with `Ctrl+Shift+P`, run **Developer: Reload Window**,
   and wait for the workspace to return.
6. Select the **DVS Visualizer** icon in the left Activity Bar. DVS also reveals
   this sidebar automatically once after a new installation or upgrade.

The setup program contains the VSIX and installs it through the official VS
Code command-line interface. It looks for normal per-user and system-wide VS
Code installations and does not require the older Visual Studio VSIX Installer.

## Alternative installation: VSIX inside VS Code

Use this method for portable or nonstandard VS Code installations, or when the
Windows setup program cannot locate VS Code.

1. Download `dvs-visualizer-0.4.0.vsix` from the
   [VS Code release](https://github.com/Jounaydh/DVS-plugin/releases/tag/v0.4.0-vscode).
2. Open Visual Studio Code.
3. Open **Extensions** with `Ctrl+Shift+X`.
4. Open the Extensions view's **Views and More Actions…** menu.
5. Choose **Install from VSIX…** and select the downloaded file.
6. Run **Developer: Reload Window** from the Command Palette when prompted.

Do not open the `.vsix` with the old Visual Studio installer. DVS is a Visual
Studio **Code** extension and must be installed from VS Code or its `code`
command.

## Alternative installation: command line

This is the exact installation method used to verify the Windows package. Open
PowerShell in the directory containing the downloaded VSIX and run:

```powershell
code --install-extension .\dvs-visualizer-0.4.0.vsix --force
```

Then confirm the installed version:

```powershell
code --list-extensions --show-versions | Select-String "jounaydh.dvs-visualizer"
```

Expected result:

```text
jounaydh.dvs-visualizer@0.4.0
```

If PowerShell cannot find `code`, use the in-app VSIX method above. You can also
add the VS Code command to `PATH` by reinstalling VS Code with **Add to PATH**
enabled.

## Open your first visualization

1. In VS Code, choose **File → Open Folder…** and open your project root. DVS
   analyzes the open workspace, not a single loose file.
2. Select **DVS Visualizer** in the left Activity Bar.
3. In **Maps & Controls**, choose one of these actions:

   - **2D Project Map** opens the project, folder, file, and symbol hierarchy.
   - **Logical Workflow Map** opens relationships such as imports, calls,
     creation, inheritance, usage, and supported database activity.
   - **Flow Left to Right** opens a horizontal map.
   - **Flow Top to Bottom** opens a vertical map.
   - **Refresh Workspace** scans the current project again.

4. The visualizer opens as a full editor tab. Use **2D flow** and **Logic map**
   at the top of that tab to switch views without leaving DVS.

Other ways to open DVS:

- Run **DVS: Open Workspace Visualizer** from `Ctrl+Shift+P`.
- Select **DVS Map** in the lower status bar.
- Press `Ctrl+Alt+D` for the 2D Map.
- Press `Ctrl+Alt+L` for the Logic Map.

## If the DVS icon is missing

Try these steps in order:

1. Run **Developer: Reload Window** from `Ctrl+Shift+P`.
2. Confirm installation with the command-line check shown above or search for
   **DVS Visualizer** in the Extensions view.
3. Right-click an empty part of the left Activity Bar and make sure
   **DVS Visualizer** is checked.
4. Open **View → Appearance → Activity Bar Position** and select **Default**.
5. Run **DVS: Open Workspace Visualizer** from the Command Palette. This remains
   available even if the Activity Bar icon was manually hidden.
6. As a last resort, run **View: Reset View Locations** from the Command Palette.
   This resets the positions of other VS Code views too.

VS Code allows users and profiles to hide or move Activity Bar entries. DVS
registers its icon as visible and reveals it once, but it will respect a later
choice to hide or move it.

## Logic Map troubleshooting

- Open the project folder before selecting **Logical Workflow Map**.
- Select **Refresh Workspace** after adding, deleting, or moving files.
- Use **View** in the visualizer toolbar to change direction or relationship
  visibility.
- Start with **Guided** mode for a large project. DVS automatically limits the
  rendered working set while preserving the analyzed relationship graph.
- A project can have a valid but sparse Logic Map when static analysis does not
  find supported relationships between its files and symbols.

DVS supports up to 5,000 workspace files, files up to 2 MB each, and the same
file types and graph performance limits as the PyCharm version.

## Update or reinstall

Download the newer setup program or VSIX from GitHub Releases and repeat the
installation. The installer uses `--force`, so it can repair or replace the
same DVS version. Reload VS Code afterward.

## Uninstall

1. Open Extensions with `Ctrl+Shift+X`.
2. Search for **DVS Visualizer**.
3. Open its gear menu and choose **Uninstall**.
4. Reload VS Code if prompted.

Command-line alternative:

```powershell
code --uninstall-extension jounaydh.dvs-visualizer
```
