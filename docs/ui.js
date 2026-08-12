function nativeMessage(message){
  if(window.webkit?.messageHandlers?.native) window.webkit.messageHandlers.native.postMessage(message);
}

document.querySelector('#addNodeBtn').onclick=()=>{
  const id=String.fromCharCode(65+nodes.length); nodes.push({id,label:'New node',x:100+(nodes.length%3)*220,y:100+(nodes.length%3)*110,shape:'round'}); selected=id; render();
};
document.querySelector('#connectBtn').onclick=()=>{ connecting=!connecting; source=null; document.querySelector('#connectBtn').classList.toggle('active',connecting); };
document.querySelector('#labelInput').oninput=e=>{const n=nodeById(selected);if(n){n.label=e.target.value;render();}};
document.querySelector('#shapeInput').onchange=e=>{const n=nodeById(selected);if(n){n.shape=e.target.value;render();}};
document.querySelector('#deleteBtn').onclick=()=>{nodes=nodes.filter(n=>n.id!==selected);edges=edges.filter(x=>x.from!==selected&&x.to!==selected);subgraphs=subgraphs.map(g=>({...g,members:g.members.filter(id=>id!==selected)}));selected=null;render();};
document.querySelector('#resetBtn').onclick=()=>{if(confirm('Reset this diagram?')) location.reload();};
document.querySelector('#copyBtn').onclick=()=>{nativeMessage({type:'copy',text:codeEditor.value});navigator.clipboard?.writeText(codeEditor.value);};
document.querySelector('#downloadBtn').onclick=()=>{nativeMessage({type:'save',name:'diagram.mmd',text:codeEditor.value});const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([codeEditor.value],{type:'text/plain'}));a.download='diagram.mmd';a.click();};
codeEditor.oninput=e=>applyMermaid(e.target.value);
document.querySelector('#zoomIn').onclick=()=>setZoom(zoom+.1); document.querySelector('#zoomOut').onclick=()=>setZoom(zoom-.1);
document.addEventListener('keydown',e=>{if(e.target.matches('input,textarea,select'))return;if(e.code==='Space'){spaceDown=true;e.preventDefault();}if(e.key.toLowerCase()==='n')document.querySelector('#addNodeBtn').click();if(e.key.toLowerCase()==='c')document.querySelector('#connectBtn').click();if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();if(selectedEdge!==null){edges.splice(selectedEdge,1);selectedEdge=null;render();}else if(!document.querySelector('#deleteBtn').disabled)document.querySelector('#deleteBtn').click();}});
document.addEventListener('keyup',e=>{if(e.code==='Space')spaceDown=false;});
