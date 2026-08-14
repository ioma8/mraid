const fs = require('fs');
const assert = require('assert');
const vm = require('vm');
const docHandlers = {};
function makeEl() {
  const handlers = {};
  return {
    value: '', disabled: false, innerHTML: '', textContent: '', style: {}, dataset: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    addEventListener(type, fn) { handlers[type] = fn; }, removeEventListener() {},
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

// give the starter diagram explicit positions (state.js declares nodes without x/y)
vm.runInContext('nodes.forEach((n,i)=>{n.x=100+i*150;n.y=100;n.width=132;n.height=48;});', ctx);
const pos = () => { const m = vm.runInContext('nodes', ctx).find(n => n.id === 'A'); return [m.x, m.y]; };

// drag node A by (60,40): records once on first real move and moves the node
const nodeEl = makeEl();
nodeEl.dataset.id = 'A';
ctx.startDrag({ button: 0, currentTarget: nodeEl, pointerId: 1, clientX: 200, clientY: 200, shiftKey: false });
docHandlers.pointermove({ clientX: 260, clientY: 240, shiftKey: false });
docHandlers.pointerup({ clientX: 260, clientY: 240, shiftKey: false });
assert.deepEqual(pos(), [160, 140], 'drag must move the node');

// one undo reverts the whole drag; redo re-applies it
ctx.undo();
assert.deepEqual(pos(), [100, 100], 'undo must restore the pre-drag position');
ctx.redo();
assert.deepEqual(pos(), [160, 140], 'redo must re-apply the dragged position');

// a click without movement creates no history entry: undo still reverts the drag
ctx.startDrag({ button: 0, currentTarget: nodeEl, pointerId: 2, clientX: 300, clientY: 300, shiftKey: false });
docHandlers.pointerup({ clientX: 300, clientY: 300, shiftKey: false });
assert.deepEqual(pos(), [160, 140], 'a plain click must not move the node');
ctx.undo();
assert.deepEqual(pos(), [100, 100], 'undo after a click must still revert the drag');
ctx.redo();
assert.deepEqual(pos(), [160, 140]);

// dragging out and back to the origin leaves no dead undo entry: undo still reverts the earlier drag
ctx.startDrag({ button: 0, currentTarget: nodeEl, pointerId: 3, clientX: 400, clientY: 400, shiftKey: false });
docHandlers.pointermove({ clientX: 460, clientY: 440, shiftKey: false });
docHandlers.pointermove({ clientX: 400, clientY: 400, shiftKey: false });
docHandlers.pointerup({ clientX: 400, clientY: 400, shiftKey: false });
assert.deepEqual(pos(), [160, 140], 'a drag that returns to the origin must not move the node');
ctx.undo();
assert.deepEqual(pos(), [100, 100], 'undo after an out-and-back drag must still revert the earlier drag, not a dead entry');
ctx.redo();
assert.deepEqual(pos(), [160, 140]);

// subgraph drags drop dead undo entries the same way: out-and-back records nothing, a real move records one step
vm.runInContext('undoStack=[];redoStack=[];nodes=[{id:"A",label:"A",x:0,y:0,width:100,height:40}];edges=[];subgraphs=[{label:"G",members:[],bounds:{x:0,y:0,width:200,height:200}}];direction="LR";', ctx);
const subEl = makeEl();
subEl.dataset.subgraph = '0';
const bounds = () => vm.runInContext('subgraphs[0].bounds', ctx);
ctx.startSubgraphDrag({ button: 0, currentTarget: subEl, pointerId: 5, clientX: 500, clientY: 500, shiftKey: false });
docHandlers.pointermove({ clientX: 560, clientY: 540, shiftKey: false });
docHandlers.pointermove({ clientX: 500, clientY: 500, shiftKey: false });
docHandlers.pointerup({ clientX: 500, clientY: 500, shiftKey: false });
assert.deepEqual(bounds(), { x: 0, y: 0, width: 200, height: 200 }, 'a subgraph dragged out and back must return to its origin');
assert.equal(vm.runInContext('undoStack.length', ctx), 0, 'an out-and-back subgraph drag must record nothing');
ctx.undo();
assert.deepEqual(bounds(), { x: 0, y: 0, width: 200, height: 200 }, 'undo after an out-and-back subgraph drag must be a no-op');
ctx.startSubgraphDrag({ button: 0, currentTarget: subEl, pointerId: 6, clientX: 500, clientY: 500, shiftKey: false });
docHandlers.pointermove({ clientX: 560, clientY: 540, shiftKey: false });
docHandlers.pointerup({ clientX: 560, clientY: 540, shiftKey: false });
assert.deepEqual(bounds(), { x: 60, y: 40, width: 200, height: 200 }, 'a real subgraph move must move the bounds');
assert.equal(vm.runInContext('undoStack.length', ctx), 1, 'a real subgraph move must record one step');
ctx.undo();
assert.deepEqual(bounds(), { x: 0, y: 0, width: 200, height: 200 }, 'undo must revert a real subgraph move');
console.log('history: node and subgraph drags record one undo step on first real move; plain clicks and out-and-back drags record nothing');
