const fs = require('fs');
const assert = require('assert');
const vm = require('vm');
const dagreContext = {structuredClone};
vm.runInNewContext(fs.readFileSync(__dirname + '/../vendor/dagre.min.js', 'utf8'), dagreContext);
const mermaidContext = {dagre: dagreContext.dagre};
vm.runInNewContext(fs.readFileSync(__dirname + '/../mermaid.js', 'utf8'), mermaidContext);
const {layoutDiagram} = mermaidContext;

// an empty subgraph must not poison the layout: dagre returns null coordinates for
// childless clusters, so empty subgraphs stay out of the graph and keep their bounds
const out = layoutDiagram({direction:'LR',nodes:[{id:'A',label:'A',x:0,y:0},{id:'B',label:'B',x:0,y:0}],edges:[{from:'A',to:'B',label:''}],subgraphs:[{label:'G',members:[],bounds:{x:200,y:0,width:400,height:400}}]},{x:650,y:450});
assert(out.nodes.every(n=>Number.isFinite(n.x)&&Number.isFinite(n.y)), 'nodes must keep finite coordinates with an emptied subgraph');
assert.equal(out.subgraphs[0].bounds.width, 400, 'the emptied subgraph keeps its explicit size');
assert.equal(out.subgraphs[0].bounds.height, 400);
assert(Number.isFinite(out.subgraphs[0].bounds.x)&&Number.isFinite(out.subgraphs[0].bounds.y), 'the emptied subgraph keeps finite bounds');

// an empty subgraph from source (no bounds yet) gets a default box and still lays out
const fresh = layoutDiagram({direction:'LR',nodes:[{id:'A',label:'A',x:0,y:0}],edges:[],subgraphs:[{label:'Empty',members:[]}]},{x:650,y:450});
assert(Number.isFinite(fresh.nodes[0].x)&&Number.isFinite(fresh.nodes[0].y), 'nodes stay finite with an empty subgraph from source');
assert.equal(fresh.subgraphs[0].bounds.width, 320, 'a fresh empty subgraph gets a default size');
assert.equal(fresh.subgraphs[0].bounds.height, 180);

// populated subgraphs still lay out with positive bounds
const populated = layoutDiagram({direction:'LR',nodes:[{id:'A',label:'A',x:0,y:0},{id:'B',label:'B',x:0,y:0}],edges:[{from:'A',to:'B',label:''}],subgraphs:[{label:'G',members:['A']}]},{x:650,y:450});
assert(populated.subgraphs[0].bounds.width>0&&populated.subgraphs[0].bounds.height>0, 'populated subgraphs still lay out with positive bounds');
console.log('layout: empty subgraphs stay out of the dagre graph and keep explicit bounds; nodes and subgraphs stay finite');
