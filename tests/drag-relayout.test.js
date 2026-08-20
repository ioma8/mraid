const fs = require('fs');
const assert = require('assert');
const vm = require('vm');
const docHandlers = {};
function makeEl() {
  return {
    value: '', disabled: false, innerHTML: '', textContent: '', style: {}, dataset: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    addEventListener(type, fn) {}, removeEventListener() {},
    setPointerCapture() {}, querySelectorAll() { return []; }, querySelector() { return null; },
    appendChild() {}, remove() {}, focus() {}, setAttribute() {}, getAttribute() { return null; },
    scrollWidth: 0, scrollHeight: 0, clientWidth: 0, clientHeight: 0, scrollLeft: 0, scrollTop: 0,
    parentElement: null, children: [], closest() { return null; },
    getBoundingClientRect() { return { left: 0, top: 0, width: 0, height: 0, bottom: 0, right: 0 }; },
    contentEditable: 'false', isContentEditable: false, offsetWidth: 0, offsetHeight: 0
  };
}
const dagreContext = {structuredClone};
vm.runInNewContext(fs.readFileSync(__dirname + '/../vendor/dagre.min.js', 'utf8'), dagreContext);
const ctx = {
  dagre: dagreContext.dagre,
  setTimeout, clearTimeout, requestAnimationFrame: () => {},
  window: {}, navigator: {},
  document: {
    querySelector: () => makeEl(), querySelectorAll: () => [], createElement: () => makeEl(),
    createElementNS: () => makeEl(),
    addEventListener(type, fn) { docHandlers[type] = fn; }, removeEventListener() {},
    getSelection: () => ({ removeAllRanges() {}, selectAllChildren() {} })
  }
};
vm.runInNewContext(fs.readFileSync(__dirname + '/../state.js', 'utf8'), ctx);
vm.runInNewContext(fs.readFileSync(__dirname + '/../history.js', 'utf8'), ctx);
vm.runInNewContext(fs.readFileSync(__dirname + '/../mermaid.js', 'utf8'), ctx);
vm.runInNewContext(fs.readFileSync(__dirname + '/../canvas.js', 'utf8'), ctx);
vm.runInNewContext(fs.readFileSync(__dirname + '/../ui.js', 'utf8'), ctx);
const J = code => vm.runInContext(code, ctx);

// dropping a node inside a subgraph adds it structurally and re-lays out
J('nodes=[{id:"A",label:"A",x:100,y:100,width:132,height:48},{id:"B",label:"B",x:300,y:100,width:132,height:48}];edges=[];subgraphs=[{label:"G",members:["B"],bounds:{x:200,y:0,width:400,height:400}}];direction="LR";');
J('globalThis.relayoutCalls=0;const _relayout=relayout;relayout=()=>{globalThis.relayoutCalls++;return _relayout();};');
const nodeEl = makeEl(); nodeEl.dataset.id = 'A';
ctx.startDrag({ button: 0, currentTarget: nodeEl, pointerId: 1, clientX: 100, clientY: 100, shiftKey: false });
docHandlers.pointermove({ clientX: 400, clientY: 200, shiftKey: false });  // drop A inside G's bounds
docHandlers.pointerup({ clientX: 400, clientY: 200, shiftKey: false });
assert(J('subgraphs[0].members.includes("A")'), 'dropping a node inside a subgraph must add it as a member');
assert.equal(J('globalThis.relayoutCalls'), 1, 'a structural drop must relayout');
assert.equal(J('undoStack.length'), 1, 'the drop must record one undo step');
ctx.undo();
assert(!J('subgraphs[0].members.includes("A")'), 'undo must restore the pre-drop membership');
assert.equal(J('undoStack.length'), 0, 'undo of the drop drains the stack');

// a plain drag that stays inside its subgraph must not relayout
J('nodes=[{id:"A",label:"A",x:100,y:100,width:132,height:48},{id:"B",label:"B",x:300,y:100,width:132,height:48}];edges=[];subgraphs=[{label:"G",members:["A"],bounds:{x:50,y:50,width:500,height:400}}];direction="LR";undoStack=[];redoStack=[];globalThis.relayoutCalls=0;');
ctx.startDrag({ button: 0, currentTarget: nodeEl, pointerId: 2, clientX: 100, clientY: 100, shiftKey: false });
docHandlers.pointermove({ clientX: 140, clientY: 120, shiftKey: false });
docHandlers.pointerup({ clientX: 140, clientY: 120, shiftKey: false });
assert.equal(J('globalThis.relayoutCalls'), 0, 'a plain move within a subgraph must not relayout');
assert(J('subgraphs[0].members.includes("A")'), 'the node must remain a member');
console.log('drag: dropping a node into a subgraph adds it and re-lays out; plain moves inside a subgraph do not');
