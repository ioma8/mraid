const fs = require('fs');
const assert = require('assert');
const vm = require('vm');
const dagreContext = {structuredClone};
vm.runInNewContext(fs.readFileSync(__dirname + '/../vendor/dagre.min.js', 'utf8'), dagreContext);
const mermaidContext = {dagre: dagreContext.dagre};
vm.runInNewContext(fs.readFileSync(__dirname + '/../mermaid.js', 'utf8'), mermaidContext);
const {parseDiagram, layoutDiagram} = mermaidContext;
const source = fs.readFileSync(__dirname + '/complex-diagram.mmd', 'utf8');
const diagram = layoutDiagram(parseDiagram(source));

assert.equal(diagram.direction, 'TD');
assert.equal(diagram.nodes.length, 27);
assert.equal(diagram.edges.length, 27);
assert.equal(diagram.subgraphs.length, 2);
assert.equal(diagram.nodes.find(node => node.id === 'A').label, 'main.rs: main()');
assert.equal(diagram.nodes.find(node => node.id === 'D').label, 'Add Features (VsCode, Find, RipGrep, Favourites, Delete, Open, MultiSelect)');
assert.equal(diagram.edges.find(edge => edge.label === 'Key Event').from, 'H');
assert.equal(diagram.edges.find(edge => edge.label === 'Message Received').to, 'M');
assert(diagram.subgraphs.every(group => group.members.length > 0));
assert(diagram.nodes.every(node => Number.isFinite(node.x) && Number.isFinite(node.y)));
const drawUi = diagram.subgraphs.find(group => group.label === 'TerminalUI.draw_ui()');
const features = diagram.subgraphs.find(group => group.label === 'Features');
assert(drawUi.bounds.width > 0 && drawUi.bounds.height > 0);
assert(features.bounds.width > 0 && features.bounds.height > 0);
console.log('complex Mermaid diagram parses and lays out correctly');

const extraSource = `flowchart LR
    __subgraph_0
    circ((ping))
    subgraph Group
        bare
        diamond{{decide}}
        bare --> diamond
    end
    diamond --> __subgraph_0`;
const extra = layoutDiagram(parseDiagram(extraSource));
assert(extra.nodes.some(node => node.id === 'bare'), 'bare node lines create nodes');
assert.equal(extra.subgraphs[0].members.length, 2);
const diamond = extra.nodes.find(node => node.id === 'diamond');
assert(diamond.width === diamond.height, 'diamond layout is square');
const circle = extra.nodes.find(node => node.id === 'circ');
assert.equal(circle.shape, 'circle');
assert(circle.width === circle.height, 'circle layout is square');
const collision = extra.nodes.find(node => node.id === '__subgraph_0');
assert(collision.x >= 0 && collision.y >= 0, 'generated subgraph ids cannot collide with user node ids');
assert(extra.nodes.every(node => Number.isFinite(node.x) && Number.isFinite(node.y)));
console.log('bare nodes, diamond sizing, and subgraph id collision safety verified');
