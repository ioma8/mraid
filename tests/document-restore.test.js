const fs = require('fs');
const assert = require('assert');
const vm = require('vm');
const ctx = {document: {querySelector: () => null}, assert, console};
vm.runInNewContext(fs.readFileSync(__dirname + '/../state.js', 'utf8'), ctx);
vm.runInNewContext(`
  const base = () => ({version:1,nodes:[{id:'A',label:'A',shape:'round',x:1,y:2,width:132,height:48},{id:'B',label:'B',shape:'square',x:3,y:4,width:132,height:48}],edges:[{from:'A',to:'B',label:'go'}],subgraphs:[],direction:'LR'});
  const doc = patch => JSON.stringify(Object.assign(base(), patch));

  assert.equal(restoreDocument(doc({})), true, 'a valid document restores');
  assert.equal(nodes.length, 2);
  assert.equal(nodes[0].x, 1);
  assert.equal(edges[0].label, 'go');

  assert.equal(restoreDocument(doc({edges:[{from:'A',to:'A',label:''}]})), false, 'self-edges are rejected');
  assert.equal(restoreDocument(doc({edges:[{from:'A',to:'B',label:''},{from:'A',to:'B',label:''}]})), false, 'duplicate edges are rejected');
  assert.equal(restoreDocument(doc({edges:[{from:'A',to:'X',label:''}]})), false, 'dangling edges are rejected');
  assert.equal(restoreDocument(doc({nodes:[...base().nodes,{id:'A',label:'dup',shape:'round',x:0,y:0,width:132,height:48}]})), false, 'duplicate node ids are rejected');
  assert.equal(restoreDocument(doc({nodes:[{...base().nodes[0],x:'nope'}]})), false, 'non-numeric positions are rejected');
  assert.equal(restoreDocument(doc({subgraphs:[{label:'G',members:['A']},{label:'H',members:['A']}]})), false, 'multiple subgraph membership is rejected');
  assert.equal(restoreDocument(doc({subgraphs:[{label:'G',members:['A','A']}]})), false, 'duplicate membership is rejected');
  assert.equal(restoreDocument(doc({subgraphs:[{label:'G',members:['X']}]})), false, 'dangling membership is rejected');
  assert.equal(restoreDocument(doc({direction:'XX'})), false, 'unknown direction is rejected');
  assert.equal(restoreDocument('flowchart LR\\nA --> B'), false, 'legacy Mermaid strings do not restore');
  assert.equal(restoreDocument('garbage'), false, 'garbage does not restore');

  assert.equal(nodes.length, 2, 'rejected documents must not replace current state');
  assert.equal(nodes[0].x, 1);
`, ctx);
console.log('document restore rejects malformed and invariant-violating documents');
