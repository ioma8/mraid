function nativeMessage(message){
  if(window.webkit?.messageHandlers?.native) window.webkit.messageHandlers.native.postMessage(message);
}

document.querySelector('#addNodeBtn').onclick=()=>{
  const id=String.fromCharCode(65+nodes.length); nodes.push({id,label:'New node',x:100+(nodes.length%3)*220,y:100+(nodes.length%3)*110,shape:'round'}); selected=id; render();
};
function nextNodeId(){let i=0;while(nodes.some(n=>n.id===String.fromCharCode(65+i)))i++;if(i<26)return String.fromCharCode(65+i);let suffix=1;while(nodes.some(n=>n.id===`N${suffix}`))suffix++;return `N${suffix}`;}
function hideNodeMenu(){nodeMenu.classList.remove('open');}
function duplicateSelected(){const original=nodeById(selected);if(!original)return;const id=nextNodeId(),copy={...original,id,x:original.x+36,y:original.y+36,label:`${original.label} copy`};nodes.push(copy);edges.push(...edges.filter(edge=>edge.to===original.id).map(edge=>({...edge,to:id})));subgraphs.forEach(group=>{if(group.members.includes(original.id))group.members.push(id);});selected=id;selectedEdge=null;hideNodeMenu();render();}
function deleteSelected(){hideNodeMenu();if(selectedEdge!==null){edges.splice(selectedEdge,1);selectedEdge=null;render();return;}if(selected){nodes=nodes.filter(n=>n.id!==selected);edges=edges.filter(x=>x.from!==selected&&x.to!==selected);subgraphs=subgraphs.map(g=>({...g,members:g.members.filter(id=>id!==selected)}));selected=null;render();}}
nodeMenu.querySelectorAll('button').forEach(button=>button.onclick=()=>button.dataset.action==='duplicate'?duplicateSelected():deleteSelected());
document.addEventListener('pointerdown',event=>{if(!event.target.closest('#nodeMenu'))hideNodeMenu();});
document.querySelector('#connectBtn').onclick=()=>{ connecting=!connecting; source=null; document.querySelector('#connectBtn').classList.toggle('active',connecting); };
document.querySelector('#labelInput').oninput=e=>{const n=nodeById(selected);if(n){n.label=e.target.value;render();}};
document.querySelector('#shapeInput').onchange=e=>{const n=nodeById(selected);if(n){n.shape=e.target.value;render();}};
document.querySelector('#deleteBtn').onclick=()=>{nodes=nodes.filter(n=>n.id!==selected);edges=edges.filter(x=>x.from!==selected&&x.to!==selected);subgraphs=subgraphs.map(g=>({...g,members:g.members.filter(id=>id!==selected)}));selected=null;render();};
document.querySelector('#resetBtn').onclick=()=>{if(confirm('Reset this diagram?')) location.reload();};
document.querySelector('#copyBtn').onclick=()=>{nativeMessage({type:'copy',text:codeEditor.value});navigator.clipboard?.writeText(codeEditor.value);};
document.querySelector('#downloadBtn').onclick=()=>{nativeMessage({type:'save',name:'diagram.mmd',text:codeEditor.value});const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([codeEditor.value],{type:'text/plain'}));a.download='diagram.mmd';a.click();};
codeEditor.oninput=e=>applyMermaid(e.target.value);
document.querySelector('#zoomIn').onclick=()=>setZoom(zoom+.1); document.querySelector('#zoomOut').onclick=()=>setZoom(zoom-.1);
document.addEventListener('keydown',e=>{if(e.target.matches('input,textarea,select'))return;if(e.code==='Space'){spaceDown=true;e.preventDefault();}if(e.key.toLowerCase()==='n')document.querySelector('#addNodeBtn').click();if(e.key.toLowerCase()==='c')document.querySelector('#connectBtn').click();if(e.key.toLowerCase()==='j'&&(e.metaKey||e.ctrlKey)){e.preventDefault();duplicateSelected();}if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();deleteSelected();}});
document.addEventListener('keyup',e=>{if(e.code==='Space')spaceDown=false;});
