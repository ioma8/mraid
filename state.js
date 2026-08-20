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
const subgraphMenu = document.querySelector('#subgraphMenu');
const canvasMenu = document.querySelector('#canvasMenu');
const splitter = document.querySelector('#splitter');
const codePanel = document.querySelector('.code-panel');
const undoBtn = document.querySelector('#undoBtn');
const redoBtn = document.querySelector('#redoBtn');

let nodes = [
  { id:'A', label:'Start here', shape:'round' },
  { id:'B', label:'Make a decision', shape:'diamond' },
  { id:'C', label:'Keep going', shape:'round' },
  { id:'D', label:'Finish', shape:'pill' }
];
let edges = [{from:'A',to:'B',label:''},{from:'B',to:'C',label:''},{from:'B',to:'D',label:''}];
let selected = null, selectedEdge = null, selectedSubgraph = null, connecting = false, source = null, zoom = 1, panX = 0, panY = 0, spaceDown = false, direction = 'LR', subgraphs = [], multiNodes = new Set(), multiEdges = new Set(), multiSubgraphs = new Set(), suppressClickToggle = false;
let gridPanX = 0, gridPanY = 0;

function nodeById(id){ return nodes.find(n=>n.id===id); }
function esc(s){ return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c])); }
function escRegex(s){ return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); }
const STORAGE_KEY='mermaid-canvas';
function storageGet(){try{return localStorage.getItem(STORAGE_KEY)}catch(e){return null}}
function storageSet(value){try{localStorage.setItem(STORAGE_KEY,value)}catch(e){}}
function storageRemove(){try{localStorage.removeItem(STORAGE_KEY)}catch(e){}}

function snapshotDiagram(){return{nodes:nodes.map(n=>({...n})),edges:edges.map(e=>({...e})),subgraphs:subgraphs.map(g=>({...g,members:[...g.members],bounds:g.bounds?{...g.bounds}:undefined})),direction};}
function saveDocument(){storageSet(JSON.stringify({version:1,...snapshotDiagram()}));}
function restoreDocument(value){let saved;try{saved=JSON.parse(value)}catch(e){return false}const shapes=['round','square','pill','diamond','circle'],dirs=['LR','RL','TB','TD','BT'];if(!saved||saved.version!==1||!Array.isArray(saved.nodes)||!Array.isArray(saved.edges)||!Array.isArray(saved.subgraphs)||!dirs.includes(saved.direction))return false;const ids=new Set(saved.nodes.map(n=>n&&n.id));if(ids.size!==saved.nodes.length||saved.nodes.some(n=>!n||!n.id||typeof n.id!=='string'||typeof n.label!=='string'||!shapes.includes(n.shape)||!Number.isFinite(n.x)||!Number.isFinite(n.y)))return false;const seen=new Set(),keys=new Set();for(const e of saved.edges){if(!e||!ids.has(e.from)||!ids.has(e.to)||e.from===e.to||typeof e.label!=='string')return false;const k=e.from+'\0'+e.to;if(keys.has(k))return false;keys.add(k);}for(const g of saved.subgraphs){if(!g||typeof g.label!=='string'||!Array.isArray(g.members))return false;for(const m of g.members){if(!ids.has(m)||seen.has(m))return false;seen.add(m);}}nodes=saved.nodes;edges=saved.edges;subgraphs=saved.subgraphs;direction=saved.direction;return true;}
