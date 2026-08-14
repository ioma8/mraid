const fs = require('fs');
const assert = require('assert');
const vm = require('vm');
const dagreContext = {structuredClone};
vm.runInNewContext(fs.readFileSync(__dirname + '/../vendor/dagre.min.js', 'utf8'), dagreContext);
const mermaidContext = {dagre: dagreContext.dagre};
vm.runInNewContext(fs.readFileSync(__dirname + '/../mermaid.js', 'utf8'), mermaidContext);
const {parseDiagram, toMermaid} = mermaidContext;

// labels that start with shape syntax survive serialize -> parse round-trips without changing shape or label
const cases = [
  ['round', '(a)(b)'], ['round', '[x]'], ['round', '((nested))'], ['round', '{{braces}}'],
  ['round', '"quoted"'], ["round", "'single'"], ['round', 'a"b\'c'], ['round', '"a\'b"'], ['round', 'plain'],
  ['circle', '(a)(b)'], ['square', '(a)(b)'], ['diamond', '{{nested}}'], ['pill', '[x]'], ['pill', '(a)(b)']
];
cases.forEach(([shape, label]) => {
  mermaidContext.nodes = [{id: 'A', label, shape}];
  mermaidContext.edges = [];
  mermaidContext.subgraphs = [];
  mermaidContext.direction = 'LR';
  const round = parseDiagram(toMermaid());
  assert.equal(round.nodes[0].shape, shape, `shape must survive round-trip: ${shape} ${JSON.stringify(label)}`);
  assert.equal(round.nodes[0].label, label, `label must survive round-trip: ${shape} ${JSON.stringify(label)}`);
});

// subgraph labels wrapped in matching quotes survive round-trips too
['"quoted"', "'single'", 'plain', 'a"b\'c', '"a\'b"', 'Subgraph with spaces'].forEach(label => {
  mermaidContext.nodes = [];
  mermaidContext.edges = [];
  mermaidContext.subgraphs = [{label, members: []}];
  mermaidContext.direction = 'LR';
  const round = parseDiagram(toMermaid());
  assert.equal(round.subgraphs[0].label, label, `subgraph label must survive round-trip: ${JSON.stringify(label)}`);
});

// the fixture round-trips through toMermaid without losing nodes, edges, subgraphs, labels, or shapes
mermaidContext.nodes = [];
mermaidContext.edges = [];
mermaidContext.subgraphs = [];
const source = fs.readFileSync(__dirname + '/complex-diagram.mmd', 'utf8');
const original = parseDiagram(source);
mermaidContext.nodes = original.nodes;
mermaidContext.edges = original.edges;
mermaidContext.subgraphs = original.subgraphs;
mermaidContext.direction = original.direction;
const again = parseDiagram(toMermaid());
assert.equal(again.nodes.length, original.nodes.length);
assert.equal(again.edges.length, original.edges.length);
assert.equal(again.subgraphs.length, original.subgraphs.length);
assert(again.nodes.every(n => n.label === original.nodes.find(o => o.id === n.id).label), 'fixture labels must survive round-trip');
assert(again.nodes.every(n => n.shape === original.nodes.find(o => o.id === n.id).shape), 'fixture shapes must survive round-trip');
console.log('mermaid: shape-syntax-prefixed labels and the fixture round-trip losslessly');
