#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
VERSION="$(cd "$PROJECT_ROOT" && node -p "require('./package.json').version")"
PLUGIN_ZIP="$PROJECT_ROOT/dvs-visualizer-pycharm-$VERSION.zip"
MAC_PLUGIN_ZIP="$PROJECT_ROOT/dvs-visualizer-pycharm-macos-$VERSION.zip"
BUILD_ROOT="$PROJECT_ROOT/build/macos-pycharm"
OUTPUT="$PROJECT_ROOT/DVS-Plugin-PyCharm-macOS-$VERSION.dmg"

cd "$PROJECT_ROOT"
chmod +x pycharm-plugin/gradlew
npm run package:pycharm
cp "$PLUGIN_ZIP" "$MAC_PLUGIN_ZIP"

rm -rf "$BUILD_ROOT"
mkdir -p "$BUILD_ROOT"
cp "$MAC_PLUGIN_ZIP" "$BUILD_ROOT/"
cp "$SCRIPT_DIR/README.txt" "$BUILD_ROOT/README.txt"

hdiutil create \
  -volname "DVS Plugin for PyCharm" \
  -srcfolder "$BUILD_ROOT" \
  -ov \
  -format UDZO \
  "$OUTPUT"

echo "$OUTPUT"
