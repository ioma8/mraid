#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="$ROOT/MermaidCanvas.app"
GENERATED="$(mktemp /tmp/mermaid-assets.XXXXXX.swift)"
trap 'rm -f "$GENERATED"' EXIT

asset() {
  printf 'let %s = #"""\n' "$1" >> "$GENERATED"
  cat "$2" >> "$GENERATED"
  printf '\n"""#\n' >> "$GENERATED"
}

: > "$GENERATED"
asset embeddedHTML "$ROOT/index.html"
asset embeddedCSS "$ROOT/style.css"

mkdir -p "$ROOT/docs"
mkdir -p "$ROOT/docs/vendor"
cp "$ROOT/index.html" "$ROOT/docs/editor.html"
cp "$ROOT/style.css" "$ROOT/state.js" "$ROOT/mermaid.js" "$ROOT/canvas.js" "$ROOT/ui.js" "$ROOT/main.js" "$ROOT/docs/"
cp "$ROOT/vendor/dagre.min.js" "$ROOT/vendor/DAGRE-LICENSE" "$ROOT/docs/vendor/"

{
  printf 'let embeddedJS = #"""\n'
  printf 'eval(atob("'
  base64 -i "$ROOT/vendor/dagre.min.js" | tr -d '\n'
  printf '")+"\\n;globalThis.dagre=dagre");\n'
  for file in state.js mermaid.js canvas.js ui.js main.js; do cat "$ROOT/$file"; printf '\n'; done
  printf '"""#\n'
} >> "$GENERATED"

rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
swiftc "$ROOT/native/main.swift" "$GENERATED" -framework Cocoa -framework WebKit -o "$APP/Contents/MacOS/MermaidCanvas"

cat > "$APP/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>CFBundleDisplayName</key><string>Mermaid Canvas</string>
  <key>CFBundleExecutable</key><string>MermaidCanvas</string>
  <key>CFBundleIdentifier</key><string>local.mermaid.canvas</string>
  <key>CFBundleName</key><string>Mermaid Canvas</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleVersion</key><string>1</string>
  <key>CFBundleShortVersionString</key><string>1.0</string>
  <key>LSMinimumSystemVersion</key><string>11.0</string>
</dict></plist>
PLIST

echo "Built $APP"
