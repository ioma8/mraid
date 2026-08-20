const fs = require('fs');
const assert = require('assert');
const vm = require('vm');
const dagreContext = {structuredClone};
vm.runInNewContext(fs.readFileSync(__dirname + '/../vendor/dagre.min.js', 'utf8'), dagreContext);
const mermaidContext = {dagre: dagreContext.dagre};
vm.runInNewContext(fs.readFileSync(__dirname + '/../mermaid.js', 'utf8'), mermaidContext);
const {parseDiagram, applyMermaid} = mermaidContext;

[
  'flowchart LR\nA --> A',
  'flowchart LR\nA --> B\nA --> B',
  'flowchart LR\nsubgraph Outer\nsubgraph Inner\nA\nend\nend',
  'flowchart LR\nsubgraph One\nA\nend\nsubgraph Two\nA\nend',
  'flowchart LR\nclassDef danger fill:red',
].forEach(source => assert.throws(() => parseDiagram(source), /unsupported|subgraph|Self|Duplicate|multiple/i));

const empty = parseDiagram('flowchart LR\nsubgraph Empty\nend');
assert.equal(empty.nodes.length, 0);
assert.equal(empty.subgraphs.length, 1);
assert.equal(empty.subgraphs[0].members.length, 0);

mermaidContext.currentViewCenter = () => ({x: 0, y: 0});
mermaidContext.render = () => {};
mermaidContext.clearSelection = () => {};
mermaidContext.nodes = [{id: 'A', label: 'old', shape: 'round', x: 1, y: 2}];
mermaidContext.edges = [];
mermaidContext.subgraphs = [];
mermaidContext.direction = 'LR';
assert.equal(applyMermaid('flowchart LR\nA[broken'), false);
assert.equal(mermaidContext.nodes[0].label, 'old');
assert.equal(mermaidContext.direction, 'LR');
console.log('domain boundaries reject invalid graphs atomically and allow empty subgraphs');
