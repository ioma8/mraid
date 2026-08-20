const fs = require('fs');
const assert = require('assert');
const vm = require('vm');
const legacySource = 'flowchart LR\nA(Start)\nB{{Decide}}\nA --> B';
let stored = null;
function makeEl() {
  return {
    value: '', disabled: false, innerHTML: '', textContent: '', title: '', style: {}, dataset: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    addEventListener() {}, removeEventListener() {}, setPointerCapture() {},
    querySelectorAll() { return []; }, querySelector() { return null; },
    appendChild() {}, remove() {}, focus() {}, setAttribute() {}, getAttribute() { return null; },
    scrollWidth: 0, scrollHeight: 0, clientWidth: 800, clientHeight: 600, scrollLeft: 0, scrollTop: 0,
    parentElement: null, children: [], closest() { return null; },
    getBoundingClientRect() { return { left: 0, top: 0, width: 800, height: 600, bottom: 600, right: 800 }; },
    contentEditable: 'false', isContentEditable: false, offsetWidth: 100, offsetHeight: 40
  };
}
const els = {};
const dagreContext = {structuredClone};
vm.runInNewContext(fs.readFileSync(__dirname + '/../vendor/dagre.min.js', 'utf8'), dagreContext);
const ctx = {
  dagre: dagreContext.dagre,
  setTimeout, clearTimeout, requestAnimationFrame: () => {},
  window: {}, navigator: {},
  localStorage: { getItem: () => legacySource, setItem: (k, v) => { stored = v; }, removeItem: () => {} },
  document: {
    querySelector: sel => els[sel] || (els[sel] = makeEl()),
    querySelectorAll: () => [], createElement: () => makeEl(), createElementNS: () => makeEl(),
    addEventListener() {}, removeEventListener() {},
    getSelection: () => ({ removeAllRanges() {}, selectAllChildren() {} })
  }
};
vm.runInNewContext(fs.readFileSync(__dirname + '/../state.js', 'utf8'), ctx);
vm.runInNewContext(fs.readFileSync(__dirname + '/../history.js', 'utf8'), ctx);
vm.runInNewContext(fs.readFileSync(__dirname + '/../mermaid.js', 'utf8'), ctx);
vm.runInNewContext(fs.readFileSync(__dirname + '/../canvas.js', 'utf8'), ctx);
vm.runInNewContext(fs.readFileSync(__dirname + '/../ui.js', 'utf8'), ctx);

// legacy autosave format (raw mermaid source, written by pre-document builds) still boots:
// the canvas parses it and the code editor shows the source
assert.equal(els['#codeEditor'].value, legacySource, 'the editor must show the restored mermaid source');
assert.equal(vm.runInContext('nodes.length', ctx), 2, 'the legacy source must parse into nodes');
assert.equal(vm.runInContext('direction', ctx), 'LR');
// the first render migrates it to the current document format
assert.equal(JSON.parse(stored).version, 1, 'the restored diagram must persist in the new document format');
assert.equal(JSON.parse(stored).nodes.length, 2);
console.log('boot: legacy source-text autosave restores the canvas, fills the editor, and migrates to the document format');
