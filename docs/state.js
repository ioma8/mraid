const canvas = document.querySelector('#canvas');
const nodesEl = document.querySelector('#nodes');
const subgraphsEl = document.querySelector('#subgraphs');
const edgesEl = document.querySelector('#edges');
const codeEditor = document.querySelector('#codeEditor');
const codeHighlight = document.querySelector('#codeHighlight');
const canvasWrap = document.querySelector('#canvasWrap');
const emptyState = document.querySelector('#emptyState');
const nodeMenu = document.querySelector('#nodeMenu');
const edgeMenu = document.querySelector('#edgeMenu');
const splitter = document.querySelector('#splitter');
const codePanel = document.querySelector('.code-panel');

let nodes = [
  { id:'A', label:'Start here', shape:'round' },
  { id:'B', label:'Make a decision', shape:'diamond' },
  { id:'C', label:'Keep going', shape:'round' },
  { id:'D', label:'Finish', shape:'pill' }
];
let edges = [{from:'A',to:'B',label:''},{from:'B',to:'C',label:''},{from:'B',to:'D',label:''}];
let selected = null, selectedEdge = null, connecting = false, source = null, zoom = 1, panX = 0, panY = 0, spaceDown = false, direction = 'LR', subgraphs = [], multiNodes = new Set(), multiEdges = new Set(), suppressClickToggle = false;

function nodeById(id){ return nodes.find(n=>n.id===id); }
function esc(s){ return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c])); }
