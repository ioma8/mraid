const fs = require('fs');
const assert = require('assert');
const vm = require('vm');
const ctx = {
  document: { querySelector: () => null },
  render() {}, clearSelection() {}, hideMenus() {}, cancelActiveDrag() {},
  setTimeout, clearTimeout,
  undoBtn: null, redoBtn: null
};
vm.runInNewContext(fs.readFileSync(__dirname + '/../state.js', 'utf8'), ctx);
vm.runInNewContext(fs.readFileSync(__dirname + '/../history.js', 'utf8'), ctx);
const { undo, redo, record, historyCodeEdit, endHistoryBurst } = ctx;
const J = code => vm.runInContext(code, ctx);
const N = (id, label, x = 0, y = 0) => ({ id, label, x, y, width: 100, height: 40 });
const reset = (nodes) => J(`nodes=${JSON.stringify(nodes)};edges=[];subgraphs=[];direction='LR';`);

// code-editor bursts coalesce: several edits within one burst are a single undo step
reset([N('X','X')]);
historyCodeEdit(() => J(`nodes.push(${JSON.stringify(N('Y','Y',10,10))});`));
historyCodeEdit(() => J(`nodes.push(${JSON.stringify(N('Z','Z',20,20))});`));
assert.equal(J('nodes.length'), 3);
undo();
assert.equal(J('nodes.length'), 1, 'one undo must revert the whole typing burst');
assert.equal(J('nodes[0].id'), 'X');
redo();
assert.equal(J('nodes.length'), 3);

// a later edit after the burst ended starts a fresh undo step
endHistoryBurst();
historyCodeEdit(() => J(`nodes.push(${JSON.stringify(N('W','W',30,30))});`));
undo();
assert.equal(J('nodes.length'), 3, 'only the post-burst edit is reverted');
redo();
assert.equal(J('nodes.length'), 4);

// a canvas operation mid-burst ends the coalescing window: each later keystroke is its own step
reset([N('X','X')]);
historyCodeEdit(() => J(`nodes.push(${JSON.stringify(N('Y','Y',10,10))});`));
record();                                        // canvas op: ends the burst, snapshots [X,Y]
J(`nodes.push(${JSON.stringify(N('C','C',20,20))});`);
historyCodeEdit(() => J(`nodes.push(${JSON.stringify(N('Z','Z',30,30))});`));
undo();
assert.equal(J('nodes.length'), 3, 'typing after a canvas op must undo as its own step');
undo();
assert.equal(J('nodes.length'), 2, 'the canvas op reverts separately from pre-op typing');
undo();
assert.equal(J('nodes.length'), 1);

// undo itself ends the burst: the next keystroke is recorded against the restored state
historyCodeEdit(() => J(`nodes.push(${JSON.stringify(N('W','W',40,40))});`));
undo();
assert.equal(J('nodes.length'), 1);
historyCodeEdit(() => J(`nodes.push(${JSON.stringify(N('V','V',50,50))});`));
undo();
assert.equal(J('nodes.length'), 1, 'a keystroke after undo must be recorded against the restored state');
redo();
assert.equal(J('nodes.length'), 2);
console.log('history: code-editor burst coalescing and burst reset on canvas ops/undo verified');
