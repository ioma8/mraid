const fs = require('fs');
const assert = require('assert');
const vm = require('vm');
const undoBtn = { disabled: true };
const redoBtn = { disabled: true };
const ctx = {
  document: { querySelector: sel => sel === '#undoBtn' ? undoBtn : sel === '#redoBtn' ? redoBtn : null },
  render() {}, clearSelection() {}, hideMenus() {}, cancelActiveDrag() {},
  setTimeout, clearTimeout,
  undoBtn, redoBtn
};
vm.runInNewContext(fs.readFileSync(__dirname + '/../state.js', 'utf8'), ctx);
vm.runInNewContext(fs.readFileSync(__dirname + '/../history.js', 'utf8'), ctx);
const { undo, redo, record, recordIfChanged } = ctx;
const J = code => vm.runInContext(code, ctx);
const N = (id, label, x = 0, y = 0) => ({ id, label, x, y, width: 100, height: 40 });
J(`nodes=[${JSON.stringify(N('A','A'))}];edges=[];subgraphs=[];direction='LR';`);

// undo/redo with empty history are safe no-ops and leave both buttons disabled
undo(); redo();
assert.equal(undoBtn.disabled, true);
assert.equal(redoBtn.disabled, true);

// record captures pre-mutation state; undo restores it; redo re-applies it
record();
assert.equal(undoBtn.disabled, false, 'a record arms undo');
J(`nodes.push(${JSON.stringify(N('B','B',10,10))});`);
assert.equal(J('nodes.length'), 2);
undo();
assert.equal(J('nodes.length'), 1);
assert.equal(J('nodes[0].id'), 'A');
assert.equal(undoBtn.disabled, true, 'undoing the only entry disarms undo');
assert.equal(redoBtn.disabled, false, 'undo arms redo');
redo();
assert.equal(J('nodes.length'), 2);
assert.equal(J('nodes[1].id'), 'B');
assert.equal(undoBtn.disabled, false);
assert.equal(redoBtn.disabled, true, 'redo of the last entry disarms redo');

// a new record after undo clears the redo branch
record();
J('nodes[1].label="B2";');
undo();
assert.equal(J('nodes[1].label'), 'B');
redo();
assert.equal(J('nodes[1].label'), 'B2');
record();
J('nodes[1].label="B3";');
undo();
assert.equal(J('nodes[1].label'), 'B2');
redo();
assert.equal(J('nodes[1].label'), 'B3');

// undo restores deep copies: subgraph bounds mutated in place must not leak into snapshots
J(`subgraphs=[${JSON.stringify({label:'G',members:['A'],bounds:{x:0,y:0,width:100,height:100}})}];`);
record();
J('subgraphs[0].bounds.x=50;');
J('subgraphs[0].members.push("B");');
undo();
assert.equal(J('subgraphs[0].bounds.x'), 0, 'in-place bounds mutation must be reverted');
assert.equal(J('subgraphs[0].members.length'), 1);
redo();
assert.equal(J('subgraphs[0].bounds.x'), 50);
assert.equal(J('subgraphs[0].members.length'), 2);
// recordIfChanged: no-op ops leave no history entry, mutating ops record one
while(!undoBtn.disabled)undo();                       // drain to a deterministic empty stack
assert.equal(undoBtn.disabled, true, 'stack drained');
recordIfChanged(()=>{});
assert.equal(undoBtn.disabled, true, 'a no-op op records nothing');
recordIfChanged(()=>J(`nodes.push(${JSON.stringify(N('C','C'))});`));
assert.equal(undoBtn.disabled, false, 'a mutating op records');
assert.equal(J('nodes.length'), 2);
undo();
assert.equal(J('nodes.length'), 1, 'undo reverts the mutating op');
assert.equal(undoBtn.disabled, true);
console.log('history: snapshot capture/restore, redo-branch clearing, deep-copy isolation, no-op drop, and button state verified');
