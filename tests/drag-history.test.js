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
const ctx = {
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
console.log('history: node drags record one undo step on first real move, and plain clicks record nothing');
