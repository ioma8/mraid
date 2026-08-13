function render(syncCode=true){
  nodesEl.innerHTML = nodes.map(n=>`<div class="node ${n.shape} ${selected===n.id?'selected':''} ${source===n.id?'connect-source':''}" data-id="${n.id}" style="left:${n.x}px;top:${n.y}px;width:${n.width||132}px${n.shape==='diamond'?`;height:${n.height||n.width||132}px`:''}"><span>${esc(n.label)}</span></div>`).join('');
  subgraphsEl.innerHTML = subgraphs.map((group,index)=>`<div class="subgraph" data-subgraph="${index}"><span>${esc(group.label)}</span></div>`).join('');
  emptyState.style.display = nodes.length ? 'none' : 'flex';
  nodesEl.querySelectorAll('.node').forEach(el=>{ el.addEventListener('pointerdown',startDrag); el.addEventListener('click',selectNode); el.addEventListener('dblclick',startInlineEdit); el.addEventListener('contextmenu',openNodeMenu); });
  requestAnimationFrame(()=>{ positionSubgraphs(); drawEdges(); }); updateProperties(); if(syncCode) codeEditor.value = toMermaid();
}

function openNodeMenu(event){
  event.preventDefault(); event.stopPropagation(); hideEdgeMenu(); window.getSelection()?.removeAllRanges(); selected=event.currentTarget.dataset.id; selectedEdge=null; updateProperties();
  nodeMenu.style.left=`${event.clientX}px`; nodeMenu.style.top=`${event.clientY}px`; nodeMenu.classList.add('open');
}

function openEdgeMenu(event,index){
  event.preventDefault(); event.stopPropagation(); hideNodeMenu();
  selected=null; selectedEdge=index;
  edgeMenu.querySelector('[data-action="add-label"]').style.display=edges[index].label?'none':'';
  edgeMenu.querySelector('[data-action="remove-label"]').style.display=edges[index].label?'':'none';
  edgeMenu.style.left=`${event.clientX}px`; edgeMenu.style.top=`${event.clientY}px`; edgeMenu.classList.add('open');
}

function startInlineEdit(event){
  event.preventDefault(); event.stopPropagation();
  const node=nodeById(event.currentTarget.dataset.id),field=event.currentTarget.querySelector('span');
  selected=node.id; field.contentEditable='true'; field.classList.add('inline-editing'); field.focus();
  const selection=window.getSelection(); selection?.selectAllChildren(field);
  const finish=commit=>{
    if(!field.isContentEditable)return;
    const value=field.textContent.trim(); field.contentEditable='false'; field.classList.remove('inline-editing');
    if(commit&&value)node.label=value; else field.textContent=node.label;
    render();
  };
  field.onblur=()=>finish(true);
  field.onkeydown=keyEvent=>{
    if(keyEvent.key==='Escape'){keyEvent.preventDefault();finish(false);}
    if(keyEvent.key==='Enter'){keyEvent.preventDefault();finish(true);}
  };
}

function startEdgeLabelEdit(mx,my,index){
  const edge=edges[index],el=document.createElement('div');
  el.className='edge-label-editing'; el.textContent=edge.label; el.contentEditable='true';
  el.style.left=mx+'px'; el.style.top=my+'px';
  canvas.appendChild(el); el.focus();
  const selection=window.getSelection(); selection?.selectAllChildren(el);
  const finish=commit=>{
    if(!el.isContentEditable)return;
    const value=el.textContent.trim(); el.contentEditable='false'; el.remove();
    if(commit&&value)edge.label=value;
    render();
  };
  el.onblur=()=>finish(true);
  el.onkeydown=keyEvent=>{
    if(keyEvent.key==='Escape'){keyEvent.preventDefault();finish(false);}
    if(keyEvent.key==='Enter'){keyEvent.preventDefault();finish(true);}
  };
}

function applyViewport(){ canvas.style.transform=`translate(${panX}px,${panY}px) scale(${zoom})`; document.querySelector('#zoomLabel').textContent=Math.round(zoom*100)+'%'; }
function setZoom(value){ zoom=Math.min(2,Math.max(.5,value)); applyViewport(); }

splitter.addEventListener('pointerdown',event=>{
  event.preventDefault(); splitter.setPointerCapture(event.pointerId); splitter.classList.add('dragging');
  const workspace=splitter.parentElement;
  const move=moveEvent=>{const rect=workspace.getBoundingClientRect(),height=Math.min(rect.height-180,Math.max(105,rect.bottom-moveEvent.clientY));codePanel.style.flexBasis=`${height}px`;};
  const up=()=>{splitter.classList.remove('dragging');splitter.removeEventListener('pointermove',move);splitter.removeEventListener('pointerup',up);};
  splitter.addEventListener('pointermove',move);splitter.addEventListener('pointerup',up);
});

canvasWrap.addEventListener('pointerdown',event=>{
  if(!spaceDown&&event.button!==1)return;
  const startX=event.clientX,startY=event.clientY,originX=panX,originY=panY;
  canvasWrap.setPointerCapture(event.pointerId); canvasWrap.classList.add('panning');
  const move=moveEvent=>{panX=originX+moveEvent.clientX-startX;panY=originY+moveEvent.clientY-startY;applyViewport();};
  const up=()=>{canvasWrap.classList.remove('panning');canvasWrap.removeEventListener('pointermove',move);canvasWrap.removeEventListener('pointerup',up);};
  canvasWrap.addEventListener('pointermove',move);canvasWrap.addEventListener('pointerup',up);
});
canvasWrap.addEventListener('wheel',event=>{
  const altPressed=event.altKey||event.getModifierState?.('Alt');
  if(!altPressed)return;
  event.preventDefault();
  const rect=canvasWrap.getBoundingClientRect();
  const viewportX=event.clientX-rect.left+canvasWrap.scrollLeft,viewportY=event.clientY-rect.top+canvasWrap.scrollTop;
  const pointX=(viewportX-panX)/zoom,pointY=(viewportY-panY)/zoom;
  const next=Math.min(2,Math.max(.5,zoom*(event.deltaY<0?1.1:.9)));
  panX=viewportX-pointX*next;panY=viewportY-pointY*next;zoom=next;applyViewport();
},{passive:false});

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
  edgesEl.querySelectorAll('.edge,.edge-label').forEach(e=>e.remove());
  edges.forEach((edge,index)=>{
    const from=nodeById(edge.from),to=nodeById(edge.to); if(!from||!to)return;
    const a=document.querySelector(`[data-id="${from.id}"]`),b=document.querySelector(`[data-id="${to.id}"]`); if(!a||!b)return;
    let x1=from.x+a.offsetWidth/2,y1=from.y+a.offsetHeight/2,x2=to.x+b.offsetWidth/2,y2=to.y+b.offsetHeight/2;
    const vertical=direction==='TB'||direction==='TD'||direction==='BT',bend=Math.max(40,(vertical?Math.abs(y2-y1):Math.abs(x2-x1))*.42);
    if(vertical){const down=y2>=y1;y1+=down?a.offsetHeight/2:-a.offsetHeight/2;y2+=down?-b.offsetHeight/2:b.offsetHeight/2;}else{const right=x2>=x1;x1+=right?a.offsetWidth/2:-a.offsetWidth/2;x2+=right?-b.offsetWidth/2:b.offsetWidth/2;}
    const path=document.createElementNS('http://www.w3.org/2000/svg','path'); path.setAttribute('class',`edge ${selectedEdge===index?'selected':''}`); path.dataset.edge=index;
    path.addEventListener('click',event=>{event.stopPropagation();selectedEdge=index;selected=null;updateProperties();drawEdges();});
    path.addEventListener('contextmenu',event=>openEdgeMenu(event,index));
    path.setAttribute('d',vertical?`M ${x1} ${y1} C ${x1} ${y1+bend}, ${x2} ${y2-bend}, ${x2} ${y2}`:`M ${x1} ${y1} C ${x1+bend} ${y1}, ${x2-bend} ${y2}, ${x2} ${y2}`); edgesEl.appendChild(path);
    if(edge.label){ const text=document.createElementNS('http://www.w3.org/2000/svg','text'); text.setAttribute('class','edge-label'); text.setAttribute('x',(x1+x2)/2); text.setAttribute('y',(y1+y2)/2-6); text.textContent=edge.label; text.dataset.mx=(x1+x2)/2; text.dataset.my=(y1+y2)/2-6; text.addEventListener('click',event=>{event.stopPropagation();selectedEdge=index;selected=null;updateProperties();edgesEl.querySelectorAll('.edge').forEach(p=>p.classList.toggle('selected',+p.dataset.edge===index));}); text.addEventListener('dblclick',event=>{event.preventDefault();event.stopPropagation();startEdgeLabelEdit(+text.dataset.mx,+text.dataset.my,index);}); text.addEventListener('contextmenu',event=>openEdgeMenu(event,index)); edgesEl.appendChild(text); }
  });
}

function selectNode(e){
  const id=e.currentTarget.dataset.id;
  if(connecting){
    if(!source){ source=id; render(); return; }
    if(source!==id&&!edges.some(x=>x.from===source&&x.to===id)) edges.push({from:source,to:id,label:''});
    source=null; connecting=false; document.querySelector('#connectBtn').classList.remove('active'); render(); return;
  }
  selected=id; selectedEdge=null;
  nodesEl.querySelectorAll('.node').forEach(node=>node.classList.toggle('selected',node.dataset.id===id));
  updateProperties();
}

function startDrag(e){
  if(e.button!==0||spaceDown||e.currentTarget.querySelector('[contenteditable="true"]'))return;
  const el=e.currentTarget,id=el.dataset.id,n=nodeById(id),startX=e.clientX,startY=e.clientY,ox=n.x,oy=n.y;
  selected=id; selectedEdge=null; nodesEl.querySelectorAll('.node').forEach(x=>x.classList.toggle('selected',x===el)); updateProperties();
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
