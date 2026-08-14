# Mermaid Canvas

Mermaid Canvas is a small, dependency-free visual editor for Mermaid flowcharts.
It supports two-way editing between the diagram canvas and Mermaid source, node dragging, inline text editing, connections, subgraphs, zooming, panning, and undo/redo (`⌘Z` / `⌘⇧Z`).

The macOS app is a native `WKWebView` wrapper around the HTML, CSS, and JavaScript UI. The web assets are embedded into the compiled executable, so the resulting `.app` does not need Electron, Node.js, npm, or a downloaded runtime.

## Requirements

- macOS
- Xcode Command Line Tools (`swiftc`, Cocoa, and WebKit)

## Build

From the project root:

```bash
./native/build.sh
```

This creates:

```text
MermaidCanvas.app
```

## Run

```bash
open MermaidCanvas.app
```

Or run the executable directly:

```bash
./MermaidCanvas.app/Contents/MacOS/MermaidCanvas
```

## Browser development

The web UI can be run without compiling the native wrapper:

```bash
python3 -m http.server 4173
```

Then open <http://localhost:4173>.

## Tests

Run the Mermaid parser/layout regression test with:

```bash
node tests/mermaid-parser.test.js
```

The native wrapper is implemented in [native/main.swift](native/main.swift), and the build script embeds [index.html](index.html), [style.css](style.css), and the split JavaScript files into the app executable.
