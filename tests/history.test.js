const fs = require('fs');
const assert = require('assert');
const vm = require('vm');
const undoBtn = { disabled: true };
const redoBtn = { disabled: true };
const ctx = {
  nodes: [{ id: 'A', label: 'A', x: 0, y: 0, width: 100, height: 40 }],
  edges: [], subgraphs: [], direction: 'LR',
  render() {}, clearSelection() {}, hideMenus() {}, cancelActiveDrag() {},
  setTimeout, clearTimeout,
  undoBtn, redoBtn
};
vm.runInNewContext(fs.readFileSync(__dirname + '/../history.js', 'utf8'), ctx);
const { undo, redo, record, recordIfChanged } = ctx;

// undo/redo with empty history are safe no-ops and leave both buttons disabled
undo(); redo();
assert.equal(undoBtn.disabled, true);
assert.equal(redoBtn.disabled, true);

// record captures pre-mutation state; undo restores it; redo re-applies it
record();
assert.equal(undoBtn.disabled, false, 'a record arms undo');
ctx.nodes.push({ id: 'B', label: 'B', x: 10, y: 10, width: 100, height: 40 });
assert.equal(ctx.nodes.length, 2);
undo();
assert.equal(ctx.nodes.length, 1);
assert.equal(ctx.nodes[0].id, 'A');
assert.equal(undoBtn.disabled, true, 'undoing the only entry disarms undo');
assert.equal(redoBtn.disabled, false, 'undo arms redo');
redo();
assert.equal(ctx.nodes.length, 2);
assert.equal(ctx.nodes[1].id, 'B');
assert.equal(undoBtn.disabled, false);
assert.equal(redoBtn.disabled, true, 'redo of the last entry disarms redo');

// a new record after undo clears the redo branch
record();
ctx.nodes[1].label = 'B2';
undo();
assert.equal(ctx.nodes[1].label, 'B');
redo();
assert.equal(ctx.nodes[1].label, 'B2');
record();
ctx.nodes[1].label = 'B3';
undo();
assert.equal(ctx.nodes[1].label, 'B2');
redo();
assert.equal(ctx.nodes[1].label, 'B3');

// undo restores deep copies: subgraph bounds mutated in place must not leak into snapshots
ctx.subgraphs = [{ label: 'G', members: ['A'], bounds: { x: 0, y: 0, width: 100, height: 100 } }];
record();
ctx.subgraphs[0].bounds.x = 50;
ctx.subgraphs[0].members.push('B');
undo();
assert.equal(ctx.subgraphs[0].bounds.x, 0, 'in-place bounds mutation must be reverted');
assert.equal(ctx.subgraphs[0].members.length, 1);
redo();
assert.equal(ctx.subgraphs[0].bounds.x, 50);
assert.equal(ctx.subgraphs[0].members.length, 2);
// recordIfChanged: no-op ops leave no history entry, mutating ops record one
while(!undoBtn.disabled)undo();                       // drain to a deterministic empty stack
assert.equal(undoBtn.disabled, true, 'stack drained');
recordIfChanged(()=>{});
assert.equal(undoBtn.disabled, true, 'a no-op op records nothing');
recordIfChanged(()=>ctx.nodes.push({ id: 'C', label: 'C', x: 0, y: 0, width: 100, height: 40 }));
assert.equal(undoBtn.disabled, false, 'a mutating op records');
assert.equal(ctx.nodes.length, 2);
undo();
assert.equal(ctx.nodes.length, 1, 'undo reverts the mutating op');
assert.equal(undoBtn.disabled, true);
console.log('history: snapshot capture/restore, redo-branch clearing, deep-copy isolation, no-op drop, and button state verified');
