function render(syncCode=true){
  nodesEl.innerHTML = nodes.map(n=>`<div class="node ${n.shape} ${selected===n.id?'selected':''} ${source===n.id?'connect-source':''}" data-id="${n.id}" style="left:${n.x}px;top:${n.y}px"><span>${esc(n.label)}</span></div>`).join('');
  subgraphsEl.innerHTML = subgraphs.map((group,index)=>`<div class="subgraph" data-subgraph="${index}"><span>${esc(group.label)}</span></div>`).join('');
  emptyState.style.display = nodes.length ? 'none' : 'flex';
  nodesEl.querySelectorAll('.node').forEach(el=>{ el.addEventListener('pointerdown',startDrag); el.addEventListener('click',selectNode); });
  requestAnimationFrame(()=>{ positionSubgraphs(); drawEdges(); }); updateProperties(); if(syncCode) codeEditor.value = toMermaid();
}

function positionSubgraphs(){
  subgraphs.forEach((group,index)=>{
    const members=group.members.map(nodeById).filter(Boolean); if(!members.length)return;
    const boxes=members.map(n=>document.querySelector(`[data-id="${n.id}"]`));
    const left=Math.min(...members.map(n=>n.x))-28, top=Math.min(...members.map(n=>n.y))-42;
    const right=Math.max(...members.map((n,i)=>n.x+(boxes[i]?.offsetWidth||132)))+28, bottom=Math.max(...members.map((n,i)=>n.y+(boxes[i]?.offsetHeight||48)))+28;
    const box=subgraphsEl.children[index]; Object.assign(box.style,{left:`${left}px`,top:`${top}px`,width:`${right-left}px`,height:`${bottom-top}px`});
  });
}

function drawEdges(){
  edgesEl.querySelectorAll('.edge').forEach(e=>e.remove());
  edges.forEach(edge=>{
    const from=nodeById(edge.from),to=nodeById(edge.to); if(!from||!to)return;
    const a=document.querySelector(`[data-id="${from.id}"]`),b=document.querySelector(`[data-id="${to.id}"]`); if(!a||!b)return;
    const x1=from.x+a.offsetWidth/2,y1=from.y+a.offsetHeight/2,x2=to.x+b.offsetWidth/2,y2=to.y+b.offsetHeight/2;
    const vertical=direction==='TB'||direction==='TD'||direction==='BT',bend=Math.max(40,(vertical?Math.abs(y2-y1):Math.abs(x2-x1))*.42);
    const path=document.createElementNS('http://www.w3.org/2000/svg','path'); path.setAttribute('class','edge');
    path.setAttribute('d',vertical?`M ${x1} ${y1} C ${x1} ${y1+bend}, ${x2} ${y2-bend}, ${x2} ${y2}`:`M ${x1} ${y1} C ${x1+bend} ${y1}, ${x2-bend} ${y2}, ${x2} ${y2}`); edgesEl.appendChild(path);
    if(edge.label){ const text=document.createElementNS('http://www.w3.org/2000/svg','text'); text.setAttribute('class','edge-label'); text.setAttribute('x',(x1+x2)/2); text.setAttribute('y',(y1+y2)/2-6); text.textContent=edge.label; edgesEl.appendChild(text); }
  });
}

function selectNode(e){
  const id=e.currentTarget.dataset.id;
  if(connecting){
    if(!source){ source=id; render(); return; }
    if(source!==id&&!edges.some(x=>x.from===source&&x.to===id)) edges.push({from:source,to:id,label:''});
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
