function nativeMessage(message){window.webkit?.messageHandlers?.native?.postMessage(message);}
document.querySelector('#addNodeBtn').onclick=addNode;
function nextNodeId(){let i=0;while(nodes.some(n=>n.id===String.fromCharCode(65+i)))i++;if(i<26)return String.fromCharCode(65+i);let suffix=1;while(nodes.some(n=>n.id===`N${suffix}`))suffix++;return `N${suffix}`;}
function hideNodeMenu(){nodeMenu.classList.remove('open');}
function hideEdgeMenu(){edgeMenu.classList.remove('open');}
function hideSubgraphMenu(){subgraphMenu.classList.remove('open');}
function hideMenus(){hideNodeMenu();hideEdgeMenu();hideSubgraphMenu();canvasMenu.classList.remove('open');}
function duplicateSelected(){const original=nodeById(selected);if(!original)return;record();const id=nextNodeId(),copy={...original,id,label:`${original.label} copy`};nodes.push(copy);edges.push(...edges.filter(edge=>edge.to===original.id).map(edge=>({...edge,to:id})));subgraphs.forEach(group=>{if(group.members.includes(original.id))group.members.push(id);});clearSelection();selected=id;hideNodeMenu();relayout();}
function deleteSelected(){hideNodeMenu();hideSubgraphMenu();if(!multiNodes.size&&!multiEdges.size&&!multiSubgraphs.size&&selected===null&&selectedEdge===null&&selectedSubgraph===null)return;record();if(multiNodes.size||multiEdges.size||multiSubgraphs.size){const ids=new Set(multiNodes);edges=edges.filter((e,i)=>!multiEdges.has(i)&&!ids.has(e.from)&&!ids.has(e.to));nodes=nodes.filter(n=>!ids.has(n.id));subgraphs=subgraphs.filter((g,i)=>!multiSubgraphs.has(i)).map(g=>({...g,members:g.members.filter(id=>!ids.has(id))}));clearSelection();render();return;}if(selectedEdge!==null){edges.splice(selectedEdge,1);selectedEdge=null;render();return;}if(selectedSubgraph!==null){subgraphs.splice(selectedSubgraph,1);selectedSubgraph=null;render();return;}if(selected){nodes=nodes.filter(n=>n.id!==selected);edges=edges.filter(x=>x.from!==selected&&x.to!==selected);subgraphs=subgraphs.map(g=>({...g,members:g.members.filter(id=>id!==selected)}));selected=null;render();}}
function wireMenu(menu,actions){menu.querySelectorAll('button').forEach(button=>button.onclick=()=>{hideMenus();actions[button.dataset.action]();});}
wireMenu(nodeMenu,{group:groupIntoSubgraph,duplicate:duplicateSelected,delete:deleteSelected});
wireMenu(subgraphMenu,{'add-node':()=>addNodeToSubgraph(selectedSubgraph),delete:deleteSelected});
wireMenu(canvasMenu,{'add-subgraph':addSubgraph,'add-node':addNode});
edgeMenu.querySelectorAll('button').forEach(button=>button.onclick=()=>{
  if(selectedEdge===null)return;
  const action=button.dataset.action;
  if(action==='add-label'){
    const edge=edges[selectedEdge],from=nodeById(edge.from),to=nodeById(edge.to),a=document.querySelector(`[data-id="${from.id}"]`),b=document.querySelector(`[data-id="${to.id}"]`);
    hideEdgeMenu(); startEdgeLabelEdit((from.x+a.offsetWidth/2+to.x+b.offsetWidth/2)/2,(from.y+a.offsetHeight/2+to.y+b.offsetHeight/2)/2-6,selectedEdge); return;
  }
  if(action==='remove-connection'){record();edges.splice(selectedEdge,1);selectedEdge=null;}
  if(action==='remove-label'){record();edges[selectedEdge].label='';selectedEdge=null;}
  hideEdgeMenu(); render();
});
document.addEventListener('pointerdown',event=>{if(!event.target.closest?.('#nodeMenu')&&!event.target.closest?.('#edgeMenu')&&!event.target.closest?.('#subgraphMenu')&&!event.target.closest?.('#canvasMenu'))hideMenus();});
document.querySelector('#connectBtn').onclick=()=>{ connecting=!connecting; source=null; document.querySelector('#connectBtn').classList.toggle('active',connecting); };
document.querySelector('#addSubgraphBtn').onclick=addSubgraph;
let labelEditTarget=null;
const labelInput=document.querySelector('#labelInput');
labelInput.addEventListener('focus',()=>{labelEditTarget=null;});
labelInput.oninput=e=>{const n=nodeById(selected);if(n){if(n.id!==labelEditTarget){record();labelEditTarget=n.id;}n.label=e.target.value;render();}};
labelInput.addEventListener('blur',()=>{labelEditTarget=null;});
document.querySelector('#shapeInput').onchange=e=>{const n=nodeById(selected);if(n){record();n.shape=e.target.value;render();}};
document.querySelector('#deleteBtn').onclick=deleteSelected;
document.querySelector('#resetBtn').onclick=()=>{if(confirm('Reset this diagram?')){storageRemove();location.reload();}};
document.querySelector('#copyBtn').onclick=()=>{nativeMessage({type:'copy',text:codeEditor.value});navigator.clipboard?.writeText(codeEditor.value);};
document.querySelector('#downloadBtn').onclick=()=>{nativeMessage({type:'save',name:'diagram.mmd',text:codeEditor.value});const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([codeEditor.value],{type:'text/plain'}));a.download='diagram.mmd';a.click();};
codeEditor.oninput=()=>historyCodeEdit(()=>applyMermaid(codeEditor.value));
codeEditor.onscroll=applyHighlightTransform;
document.querySelector('#zoomIn').onclick=()=>setZoom(zoom+.1); document.querySelector('#zoomOut').onclick=()=>setZoom(zoom-.1);
document.querySelector('#relayoutBtn').onclick=()=>recordIfChanged(relayout);
document.querySelector('#undoBtn').onclick=undo; document.querySelector('#redoBtn').onclick=redo;
document.addEventListener('keydown',e=>{const mod=e.metaKey||e.ctrlKey;if(e.target===codeEditor&&mod&&(e.key.toLowerCase()==='z'||e.key.toLowerCase()==='y')){e.preventDefault();(e.shiftKey||e.key.toLowerCase()==='y')?redo():undo();return;}if(e.target.closest('input,textarea,select,[contenteditable="true"]'))return;if(e.code==='Space'){spaceDown=true;e.preventDefault();}if(mod&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo();return;}if(mod&&e.key.toLowerCase()==='y'){e.preventDefault();redo();return;}if(mod&&e.key.toLowerCase()==='j'){e.preventDefault();duplicateSelected();return;}if(!mod&&!e.altKey&&e.key.toLowerCase()==='n')document.querySelector('#addNodeBtn').click();if(!mod&&!e.altKey&&e.key.toLowerCase()==='c')document.querySelector('#connectBtn').click();if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();deleteSelected();}});
document.addEventListener('keyup',e=>{if(e.code==='Space')spaceDown=false;});

// boot: restore the autosaved diagram, or render the starter
const saved=storageGet();if(saved!==null){if(restoreDocument(saved))render();else if(!applyMermaid(saved))relayout();}else relayout();
