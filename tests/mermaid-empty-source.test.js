const fs = require('fs');
const assert = require('assert');
const vm = require('vm');
const dagreContext = {structuredClone};
vm.runInNewContext(fs.readFileSync(__dirname + '/../vendor/dagre.min.js', 'utf8'), dagreContext);
const mermaidContext = {dagre: dagreContext.dagre};
vm.runInNewContext(fs.readFileSync(__dirname + '/../mermaid.js', 'utf8'), mermaidContext);
const {applyMermaid} = mermaidContext;

// an empty or header-only source clears the canvas instead of being silently ignored
mermaidContext.currentViewCenter = () => ({x: 0, y: 0});
mermaidContext.render = () => {};
mermaidContext.clearSelection = () => {};
mermaidContext.nodes = [{id: 'A', label: 'A', x: 0, y: 0, width: 100, height: 40}];
mermaidContext.edges = [{from: 'A', to: 'A', label: ''}];
mermaidContext.subgraphs = [{label: 'G', members: ['A']}];
mermaidContext.direction = 'LR';
applyMermaid('');
assert.equal(mermaidContext.nodes.length, 0, 'an empty source must clear the canvas');
assert.equal(mermaidContext.edges.length, 0);
assert.equal(mermaidContext.subgraphs.length, 0);
applyMermaid('flowchart TD');
assert.equal(mermaidContext.direction, 'TD', 'a header-only source still applies its direction');
assert.equal(mermaidContext.nodes.length, 0);
console.log('mermaid: empty and header-only sources clear the canvas and still apply direction');
