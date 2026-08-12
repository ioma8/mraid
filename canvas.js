function render(syncCode=true){
  nodesEl.innerHTML = nodes.map(n=>`<div class="node ${n.shape} ${selected===n.id?'selected':''} ${source===n.id?'connect-source':''}" data-id="${n.id}" style="left:${n.x}px;top:${n.y}px"><span>${esc(n.label)}</span></div>`).join('');
  emptyState.style.display = nodes.length ? 'none' : 'flex';
  nodesEl.querySelectorAll('.node').forEach(el=>{ el.addEventListener('pointerdown',startDrag); el.addEventListener('click',selectNode); });
  drawEdges(); updateProperties(); if(syncCode) codeEditor.value = toMermaid();
}

function drawEdges(){
  edgesEl.querySelectorAll('.edge').forEach(e=>e.remove());
  edges.forEach(([a,b])=>{
    const from=nodeById(a), to=nodeById(b); if(!from||!to)return;
    const x1=from.x+66,y1=from.y+24,x2=to.x+66,y2=to.y+24,bend=Math.max(40,Math.abs(x2-x1)*.42);
    const path=document.createElementNS('http://www.w3.org/2000/svg','path');
    path.setAttribute('class','edge'); path.setAttribute('d',`M ${x1} ${y1} C ${x1+bend} ${y1}, ${x2-bend} ${y2}, ${x2} ${y2}`); edgesEl.appendChild(path);
  });
}

function selectNode(e){
  const id=e.currentTarget.dataset.id;
  if(connecting){
    if(!source){ source=id; render(); return; }
    if(source!==id&&!edges.some(x=>x[0]===source&&x[1]===id)) edges.push([source,id]);
    source=null; connecting=false; document.querySelector('#connectBtn').classList.remove('active'); render(); return;
  }
  selected=id; render();
}

function startDrag(e){
  if(e.button!==0)return;
  const el=e.currentTarget,id=el.dataset.id,n=nodeById(id),startX=e.clientX,startY=e.clientY,ox=n.x,oy=n.y;
  selected=id; nodesEl.querySelectorAll('.node').forEach(x=>x.classList.toggle('selected',x===el)); updateProperties();
  const move=ev=>{
    let x=Math.max(12,Math.round(ox+(ev.clientX-startX)/zoom));
    let y=Math.max(12,Math.round(oy+(ev.clientY-startY)/zoom));
    if(ev.shiftKey){ x=Math.round(x/20)*20; y=Math.round(y/20)*20; }
    n.x=x; n.y=y; el.style.left=n.x+'px';el.style.top=n.y+'px';drawEdges();
  };
  const up=()=>{document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',up);codeEditor.value=toMermaid();};
  document.addEventListener('pointermove',move); document.addEventListener('pointerup',up);
}

function updateProperties(){
  const n=nodeById(selected), label=document.querySelector('#labelInput'), shape=document.querySelector('#shapeInput'), del=document.querySelector('#deleteBtn');
  document.querySelector('#selectedId').textContent=n?.id||'—'; label.disabled=shape.disabled=del.disabled=!n;
  if(n){ label.value=n.label; shape.value=n.shape; }
}
