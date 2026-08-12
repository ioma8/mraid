const canvas = document.querySelector('#canvas');
const nodesEl = document.querySelector('#nodes');
const subgraphsEl = document.querySelector('#subgraphs');
const edgesEl = document.querySelector('#edges');
const codeEditor = document.querySelector('#codeEditor');
const emptyState = document.querySelector('#emptyState');

let nodes = [
  { id:'A', label:'Start here', x:150, y:165, shape:'round' },
  { id:'B', label:'Make a decision', x:390, y:165, shape:'diamond' },
  { id:'C', label:'Keep going', x:650, y:95, shape:'round' },
  { id:'D', label:'Finish', x:650, y:245, shape:'pill' }
];
let edges = [{from:'A',to:'B',label:''},{from:'B',to:'C',label:''},{from:'B',to:'D',label:''}];
let selected = null, connecting = false, source = null, zoom = 1, direction = 'LR', subgraphs = [];

function nodeById(id){ return nodes.find(n=>n.id===id); }
function esc(s){ return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c])); }
