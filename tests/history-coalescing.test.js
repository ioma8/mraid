const fs = require('fs');
const assert = require('assert');
const vm = require('vm');
const ctx = {
  nodes: [{ id: 'X', label: 'X', x: 0, y: 0, width: 100, height: 40 }],
  edges: [], subgraphs: [], direction: 'LR',
  render() {}, clearSelection() {}, hideMenus() {}, cancelActiveDrag() {},
  setTimeout, clearTimeout,
  undoBtn: null, redoBtn: null
};
vm.runInNewContext(fs.readFileSync(__dirname + '/../history.js', 'utf8'), ctx);
const { undo, redo, record, historyCodeEdit, endHistoryBurst } = ctx;

// code-editor bursts coalesce: several edits within one burst are a single undo step
historyCodeEdit(() => ctx.nodes.push({ id: 'Y', label: 'Y', x: 10, y: 10, width: 100, height: 40 }));
historyCodeEdit(() => ctx.nodes.push({ id: 'Z', label: 'Z', x: 20, y: 20, width: 100, height: 40 }));
assert.equal(ctx.nodes.length, 3);
undo();
assert.equal(ctx.nodes.length, 1, 'one undo must revert the whole typing burst');
assert.equal(ctx.nodes[0].id, 'X');
redo();
assert.equal(ctx.nodes.length, 3);

// a later edit after the burst ended starts a fresh undo step
endHistoryBurst();
historyCodeEdit(() => ctx.nodes.push({ id: 'W', label: 'W', x: 30, y: 30, width: 100, height: 40 }));
undo();
assert.equal(ctx.nodes.length, 3, 'only the post-burst edit is reverted');
redo();
assert.equal(ctx.nodes.length, 4);

// a canvas operation mid-burst ends the coalescing window: each later keystroke is its own step
ctx.nodes = [{ id: 'X', label: 'X', x: 0, y: 0, width: 100, height: 40 }];
ctx.edges = []; ctx.subgraphs = []; ctx.direction = 'LR';
historyCodeEdit(() => ctx.nodes.push({ id: 'Y', label: 'Y', x: 10, y: 10, width: 100, height: 40 }));
record();                                        // canvas op: ends the burst, snapshots [X,Y]
ctx.nodes.push({ id: 'C', label: 'C', x: 20, y: 20, width: 100, height: 40 });
historyCodeEdit(() => ctx.nodes.push({ id: 'Z', label: 'Z', x: 30, y: 30, width: 100, height: 40 }));
undo();
assert.equal(ctx.nodes.length, 3, 'typing after a canvas op must undo as its own step');
undo();
assert.equal(ctx.nodes.length, 2, 'the canvas op reverts separately from pre-op typing');
undo();
assert.equal(ctx.nodes.length, 1);

// undo itself ends the burst: the next keystroke is recorded against the restored state
historyCodeEdit(() => ctx.nodes.push({ id: 'W', label: 'W', x: 40, y: 40, width: 100, height: 40 }));
undo();
assert.equal(ctx.nodes.length, 1);
historyCodeEdit(() => ctx.nodes.push({ id: 'V', label: 'V', x: 50, y: 50, width: 100, height: 40 }));
undo();
assert.equal(ctx.nodes.length, 1, 'a keystroke after undo must be recorded against the restored state');
redo();
assert.equal(ctx.nodes.length, 2);
console.log('history: code-editor burst coalescing and burst reset on canvas ops/undo verified');
