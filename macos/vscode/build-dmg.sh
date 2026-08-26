#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
VERSION="$(cd "$PROJECT_ROOT" && node -p "require('./package.json').version")"
VSIX="$PROJECT_ROOT/dvs-visualizer-$VERSION.vsix"
BUILD_ROOT="$PROJECT_ROOT/build/macos-vscode"
APP="$BUILD_ROOT/Install DVS Plugin.app"
OUTPUT="$PROJECT_ROOT/DVS-Plugin-VSCode-macOS-$VERSION.dmg"

cd "$PROJECT_ROOT"
npm run package:vsix

rm -rf "$BUILD_ROOT"
mkdir -p "$BUILD_ROOT"
osacompile -o "$APP" "$SCRIPT_DIR/Install DVS Plugin.applescript"
cp "$VSIX" "$APP/Contents/Resources/dvs-visualizer-$VERSION.vsix"
cp "$SCRIPT_DIR/README.txt" "$BUILD_ROOT/README.txt"

hdiutil create \
  -volname "DVS Plugin for VS Code" \
  -srcfolder "$BUILD_ROOT" \
  -ov \
  -format UDZO \
  "$OUTPUT"

echo "$OUTPUT"
