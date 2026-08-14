# Repository Guidelines

## Project Overview

**Mermaid Canvas** (`mraid`) — a WYSIWYG editor for a subset of Mermaid flowchart syntax. Users build diagrams visually (drag nodes, draw edges) or by editing Mermaid source; the two views stay in sync. Ships as a native macOS WKWebView app (`MermaidCanvas.app`) wrapping a dependency-free vanilla-JS web app. Zero npm dependencies, zero bundler, zero framework — the only third-party code is vendored `dagre` (graph layout).

## Architecture & Data Flow

**Script-tag app, shared global scope.** No ES modules, no imports. `index.html` loads scripts in a contractual order (this order *is* the module system — do not reorder, and new files must slot in):

```
vendor/dagre.min.js → state.js → history.js → mermaid.js → canvas.js → ui.js
```

- `vendor/dagre.min.js` defines the global `dagre` object (graphlib `Graph` + layout engine).
- `state.js` declares DOM element cache + all mutable globals (`nodes`, `edges`, `subgraphs`, `selected`, `zoom`, `panX/panY`, `direction`, …) and helpers (`nodeById`, `esc`) plus the autosave storage helpers (`storageGet`/`storageSet`/`storageRemove` over `localStorage`, key `mermaid-canvas`). Top-level `let`/`const` here is directly readable/writable by later files.
- `history.js` — snapshot undo/redo. `record()` must be called at the start of **every mutating operation** (before the mutation) to capture the pre-op state; `recordIfChanged(apply)` wraps ops that may not change anything (e.g. Relayout) — it records, runs, and drops the entry if the state came back identical; drag handlers call `dropLastIfUnchanged()` on pointerup so a drag-out-and-back leaves no dead undo entry. `undo()`/`redo()` restore whole-state snapshots (deep-copied `nodes`/`edges`/`subgraphs`/`direction`) and re-sync both views. Code-editor input is coalesced into one undo step per typing burst via `historyCodeEdit()`. Any non-burst `record()` (a canvas op) and any undo/redo ends an open typing burst; undo/redo also cancels an in-progress drag (`cancelActiveDrag` in canvas.js) so a restore can't be followed by an unrecorded membership write. History is bounded (100 entries) and viewport/selection are not part of snapshots.
- `mermaid.js` is **NOT the Mermaid library** — a hand-written parser/layout/serializer for a small flowchart subset (no `classDef`, styling, or non-flowchart types). Exports `parseDiagram`, `layoutDiagram`, `applyMermaid`, `toMermaid`; CommonJS guard on line 25 enables Node tests. Serializer ceiling: `toMermaid` quotes node and subgraph labels when the naive form would misparse, but edge labels cannot contain `|` and no label can contain a newline.
- `canvas.js` owns rendering + interactions: `render()`, `drawEdges()`, `positionSubgraphs()`, pan/zoom, drag, inline edit, context menu.
- `ui.js` wires buttons/keyboard + the WKWebView native bridge, and boots the diagram (restores the autosaved `localStorage` copy or renders the starter).

**Two-way sync** (the central invariant):
- Canvas → code: interactions mutate globals → `render()` rebuilds DOM → `codeEditor.value = toMermaid()`.
- Code → canvas: `codeEditor.oninput` → `applyMermaid(value)` → `parseDiagram` → `layoutDiagram` (dagre assigns x/y) → globals replaced → `render(false)` (the `false` skips rewriting the editor, preventing a feedback loop).

**Rendering model:** nodes are absolutely-positioned `<div>`s on a fixed 1300×900 surface; edges are SVG cubic-Bézier `<path>`s inside `svg#edges`, recomputed from scratch each draw from node x/y + measured offsets (edges are derived, never stored). Viewport pan/zoom is one CSS `transform` on `#canvas`.

## Key Directories

| Path | Purpose |
|---|---|
| repo root | Source of truth: `index.html`, `state.js`, `history.js`, `mermaid.js`, `canvas.js`, `ui.js`, `style.css` |
| `vendor/` | Vendored `dagre.min.js` + `DAGRE-LICENSE` (MIT, Chris Pettitt) |
| `native/` | `main.swift` (WKWebView wrapper) + `build.sh` (app/docs build) |
| `tests/` | `mermaid-parser.test.js` + `mermaid-roundtrip.test.js` + `mermaid-empty-source.test.js` + `history.test.js` + `history-coalescing.test.js` + `drag-history.test.js` + `complex-diagram.mmd` fixture |
| `MermaidCanvas.app/` | Prebuilt macOS app (committed build artifact) |

**Serving:** the repo root is the publish root — `index.html` and its relative asset links work from any static server (GitHub Pages from `/`, `python3 -m http.server`, …).

## Development Commands

From repo root:

| Action | Command |
|---|---|
| Run tests | `node tests/mermaid-parser.test.js`, `node tests/mermaid-roundtrip.test.js`, `node tests/mermaid-empty-source.test.js`, `node tests/history.test.js`, `node tests/history-coalescing.test.js`, `node tests/drag-history.test.js` |
| Build native app | `./native/build.sh` |
| Run native app | `open MermaidCanvas.app` |
| Browser dev (any static server works) | `python3 -m http.server 4173` → http://localhost:4173 |
| Install deps | None — nothing to install, no `package.json` |

No lint/format/typecheck/build-for-web steps exist. No CI.

## Code Conventions & Common Patterns

- **Naming:** verb-first camelCase functions (`render`, `drawEdges`, `startDrag`, `applyMermaid`, `nodeById`, `nextNodeId`). DOM cache vars mostly `…El`-suffixed (`nodesEl`, `edgesEl`). Terse params (`n`, `e`, `el`, `ev`). Shapes: `round/square/pill/diamond/circle`.
- **Style:** aggressively compact — one-liners, no spaces around operators (`n.x=x;n.y=y;`), ternaries over `if/else`, template literals for DOM, semicolons. Match it; there is no formatter to fix you.
- **DOM:** full `innerHTML` rebuild of node/subgraph containers per render + per-element listener re-binding; `document.querySelector('[data-id="..."]')` lookups; SVG via `createElementNS('http://www.w3.org/2000/svg', …)`.
- **Events:** mix of `.onclick =` property assignment (ui.js) and `addEventListener` (canvas.js). Drags use pointer capture + temporary document-level `pointermove/pointerup` listeners removed on up.
- **State management:** plain mutable globals, no reducer/observer. Some state reassigned wholesale (`nodes = laidOut.nodes`), some mutated in place. Follow whichever the local code path does; there is no framework discipline.
- **Error handling:** none anywhere — no `try/catch` (the lone exceptions are the `localStorage` guards in `state.js`, which must swallow the `SecurityError` that `loadHTMLString`-based WKWebView pages throw on opaque origins). Defensive style is optional chaining (`window.webkit?.messageHandlers?.native`, `navigator.clipboard?.writeText`) and silent early returns (`if(!from||!to)return;`). A missing `dagre` global throws a bare `ReferenceError`.
- **Async:** only `requestAnimationFrame` (in `render()`) and the code-edit burst timer in `history.js`. Fully synchronous, event-driven — no promises/fetch/workers.
- **XSS discipline (keep it):** user labels escaped with `esc()` before `innerHTML`; SVG text set via `textContent`.
- **Keyboard shortcuts** (ui.js): `Space`=pan modifier, `N`=add node, `C`=connect mode, `⌘/Ctrl+J`=duplicate, `⌘/Ctrl+Z`=undo, `⌘/Ctrl+⇧Z` or `⌘/Ctrl+Y`=redo, `Delete/Backspace`=delete. Everything is ignored when focus is in an input **except** `⌘/Ctrl+Z/⇧Z/Y` inside the code editor, which route through the app undo/redo system (so native text-undo can't create phantom app-history steps); the sidebar label field keeps native text undo.

## Important Files

- `index.html` — app shell; script-load order (lines 48–53) is the wiring contract.
- `state.js` — DOM cache (lines 1–16) + all state (lines 18–25) + storage helpers. The whole diagram autosaves to `localStorage` (`mermaid-canvas`) on every `render()`; `ui.js` restores it on boot and Reset clears it.
- `history.js` — snapshot undo/redo (`record`/`recordIfChanged`/`undo`/`redo`/`historyCodeEdit`); the only state file with its own tests (`history.test.js` + `history-coalescing.test.js` + `drag-history.test.js`).
- `mermaid.js` — parser/layout/serializer. `layoutDiagram` builds a dagre compound graph (`nodesep:60`, `ranksep:80`, width ≈ `label.length*7+36` clamped 132–300).
- `canvas.js` — rendering + interaction core (368 lines).
- `native/main.swift` — WKWebView wrapper; JS→native bridge via `window.webkit.messageHandlers.native.postMessage` with `{type:"copy"|"save", text, name?}`.
- `native/build.sh` — embeds all web assets as Swift string constants (dagre base64'd into `eval(atob(...))`), `swiftc -framework Cocoa -framework WebKit`, assembles `.app`. No codesign.
- `README.md` — user-facing; note it claims "dependency-free" (accurate in the npm sense, though `dagre` is vendored).

## Runtime/Tooling Preferences

- **macOS only** for the native app; requires **Xcode Command Line Tools** (`swiftc`, Cocoa, WebKit). Swift version unpinned. Minimum target macOS 11.0 (`LSMinimumSystemVersion`).
- **Node ≥ 17** only for running tests (needs the `structuredClone` global). No `.nvmrc`/engines field.
- **Python 3** optional, for the static dev server.
- No `package.json`, no lockfile, no `.gitignore`, no `.editorconfig`, no lint/format configs, no CI.
- Browser dev and native app share the same root files; the native build inlines them.

## Testing & QA

- **Framework: none.** `tests/mermaid-parser.test.js` is a plain Node script using built-in `assert` (non-strict), top-level asserts, no `describe/it`. First failure exits non-zero; a final `console.log(...)` is the success signal.
- **Run:** `node tests/mermaid-parser.test.js` (paths are `__dirname`-relative, cwd-independent).
- **Loading pattern (required for new tests):** `mermaid.js` must be loaded via `vm.runInNewContext` in two steps — dagre into a `{structuredClone}` context, then `mermaid.js` into a `{dagre}` context — then destructure `{parseDiagram, layoutDiagram}` off the context. Direct `require` of dagre fails (it references `structuredClone`).
- **Fixture:** `tests/complex-diagram.mmd` (27 nodes / 27 edges / 2 subgraphs, quoted labels, labeled edges, back-edges — exact counts are asserted). One scenario, one fixture.
- **What's asserted:** direction, node/edge/subgraph counts, spot-checked labels, edge endpoints by label, subgraph membership, finite layout coordinates, positive subgraph bounds.
- **Coverage:** none — no tool, no thresholds, no CI enforcement. Six regression tests make up the whole suite.
- **Conventions for new tests:** `<unit>.test.js` in `tests/`, fixtures `.mmd` colocated, `assert.equal` for exact values / bare truthy `assert(...)` for invariants, one scenario per file, end with a descriptive `console.log`.

**Known quirks to avoid tripping on:** `mermaid.js` name is misleading (custom parser, not the Mermaid npm package); `MermaidCanvas.app/` is a regenerated artifact; loading a root JS file outside its script-order context will ReferenceError on missing globals.
