function render(syncCode=true){
  nodesEl.innerHTML = nodes.map(n=>`<div class="node ${n.shape} ${selected===n.id||multiNodes.has(n.id)?'selected':''} ${source===n.id?'connect-source':''}" data-id="${n.id}" style="left:${n.x}px;top:${n.y}px;width:${n.width||132}px${n.shape==='diamond'||n.shape==='circle'?`;height:${n.height||n.width||132}px`:''}"><span>${esc(n.label)}</span></div>`).join('');
  subgraphsEl.innerHTML = subgraphs.map((group,index)=>`<div class="subgraph" data-subgraph="${index}"><span>${esc(group.label)}</span></div>`).join('');
  emptyState.style.display = nodes.length ? 'none' : 'flex';
  nodesEl.querySelectorAll('.node').forEach(el=>{ el.addEventListener('pointerdown',startDrag); el.addEventListener('click',selectNode); el.addEventListener('dblclick',startInlineEdit); el.addEventListener('contextmenu',openNodeMenu); });
  requestAnimationFrame(()=>{ positionSubgraphs(); drawEdges(); }); updateProperties(); if(syncCode) codeEditor.value = toMermaid(); syncCodeHighlight();
}

function openNodeMenu(event){
  event.preventDefault(); event.stopPropagation(); hideEdgeMenu(); clearMultiSelection(); window.getSelection()?.removeAllRanges(); selected=event.currentTarget.dataset.id; selectedEdge=null; nodesEl.querySelectorAll('.node').forEach(node=>node.classList.toggle('selected',node.dataset.id===selected)); edgesEl.querySelectorAll('.edge').forEach(edge=>edge.classList.remove('selected')); updateProperties();
  nodeMenu.style.left=`${event.clientX}px`; nodeMenu.style.top=`${event.clientY}px`; nodeMenu.classList.add('open');
}

function openEdgeMenu(event,index){
  event.preventDefault(); event.stopPropagation(); hideNodeMenu(); clearMultiSelection();
  selected=null; selectedEdge=index;
  nodesEl.querySelectorAll('.node').forEach(node=>node.classList.remove('selected'));
  edgesEl.querySelectorAll('.edge').forEach(edge=>edge.classList.toggle('selected',+edge.dataset.edge===index));
  edgeMenu.querySelector('[data-action="add-label"]').style.display=edges[index].label?'none':'';
  edgeMenu.querySelector('[data-action="remove-label"]').style.display=edges[index].label?'':'none';
  edgeMenu.style.left=`${event.clientX}px`; edgeMenu.style.top=`${event.clientY}px`; edgeMenu.classList.add('open'); syncCodeHighlight();
}

function startInlineEdit(event){
  event.preventDefault(); event.stopPropagation();
  const node=nodeById(event.currentTarget.dataset.id),field=event.currentTarget.querySelector('span');
  clearMultiSelection(); selected=node.id; selectedEdge=null; edgesEl.querySelectorAll('.edge').forEach(edge=>edge.classList.remove('selected')); field.contentEditable='true'; field.classList.add('inline-editing'); field.focus();
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
  clearMultiSelection(); selected=null; selectedEdge=index;
  nodesEl.querySelectorAll('.node').forEach(node=>node.classList.remove('selected'));
  edgesEl.querySelectorAll('.edge').forEach(p=>p.classList.toggle('selected',+p.dataset.edge===index));
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

function clearMultiSelection(){multiNodes.clear();multiEdges.clear();}
function seedMultiSelection(){if(selected!==null&&!multiNodes.has(selected))multiNodes.add(selected);if(selectedEdge!==null&&!multiEdges.has(selectedEdge))multiEdges.add(selectedEdge);}
function applyViewport(){ canvas.style.transform=`translate(${panX}px,${panY}px) scale(${zoom})`; document.querySelector('#zoomLabel').textContent=Math.round(zoom*100)+'%'; }
function currentViewCenter(){ return {x:(canvasWrap.clientWidth-2*panX)/(2*zoom),y:(canvasWrap.clientHeight-2*panY)/(2*zoom)}; }
function setZoom(value){ zoom=Math.min(2,Math.max(.5,value)); applyViewport(); }
function startMarquee(event){
  const rect=canvasWrap.getBoundingClientRect(),sx=Math.round((event.clientX-rect.left-panX)/zoom),sy=Math.round((event.clientY-rect.top-panY)/zoom);
  const el=document.createElement('div'); el.className='marquee'; el.style.left=sx+'px'; el.style.top=sy+'px'; canvas.appendChild(el);
  const move=ev=>{
    const x=Math.round((ev.clientX-rect.left-panX)/zoom),y=Math.round((ev.clientY-rect.top-panY)/zoom);
    Object.assign(el.style,{left:Math.min(sx,x)+'px',top:Math.min(sy,y)+'px',width:Math.abs(x-sx)+'px',height:Math.abs(y-sy)+'px'});
  };
  const up=ev=>{
    const x=Math.round((ev.clientX-rect.left-panX)/zoom),y=Math.round((ev.clientY-rect.top-panY)/zoom);
    document.removeEventListener('pointermove',move); document.removeEventListener('pointerup',up); el.remove();
    if(Math.abs(x-sx)<3&&Math.abs(y-sy)<3){clearMultiSelection();selected=null;selectedEdge=null;render();return;}
    const left=Math.min(sx,x),top=Math.min(sy,y),right=Math.max(sx,x),bottom=Math.max(sy,y),ids=[];
    nodes.forEach(n=>{if(n.x<right&&n.x+n.width>left&&n.y<bottom&&n.y+n.height>top)ids.push(n.id);});
    clearMultiSelection();
    ids.forEach(id=>multiNodes.add(id));
    edges.forEach((edge,index)=>{
      const from=nodeById(edge.from),to=nodeById(edge.to); if(!from||!to)return;
      const mx=(from.x+from.width/2+to.x+to.width/2)/2,my=(from.y+from.height/2+to.y+to.height/2)/2;
      if(mx>left&&mx<right&&my>top&&my<bottom)multiEdges.add(index);
    });
    selected=ids[0]||null; selectedEdge=multiEdges.size?[...multiEdges][0]:null; render();
  };
  document.addEventListener('pointermove',move); document.addEventListener('pointerup',up);
}

splitter.addEventListener('pointerdown',event=>{
  event.preventDefault(); splitter.setPointerCapture(event.pointerId); splitter.classList.add('dragging');
  const workspace=splitter.parentElement;
  const move=moveEvent=>{const rect=workspace.getBoundingClientRect(),height=Math.min(rect.height-180,Math.max(105,rect.bottom-moveEvent.clientY));codePanel.style.flexBasis=`${height}px`;};
  const up=()=>{splitter.classList.remove('dragging');splitter.removeEventListener('pointermove',move);splitter.removeEventListener('pointerup',up);};
  splitter.addEventListener('pointermove',move);splitter.addEventListener('pointerup',up);
});

canvasWrap.addEventListener('pointerdown',event=>{
  if(spaceDown||event.button===1){
    const startX=event.clientX,startY=event.clientY,originX=panX,originY=panY;
    canvasWrap.setPointerCapture(event.pointerId); canvasWrap.classList.add('panning');
    const move=moveEvent=>{panX=originX+moveEvent.clientX-startX;panY=originY+moveEvent.clientY-startY;applyViewport();};
    const up=()=>{canvasWrap.classList.remove('panning');canvasWrap.removeEventListener('pointermove',move);canvasWrap.removeEventListener('pointerup',up);};
    canvasWrap.addEventListener('pointermove',move);canvasWrap.addEventListener('pointerup',up);
    return;
  }
  if(event.button===0&&!event.target.closest('.node,.edge,.edge-label,.subgraph'))startMarquee(event);
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
    const vertical=direction==='TB'||direction==='TD'||direction==='BT',down=y2>=y1,right=x2>=x1,bend=Math.max(40,(vertical?Math.abs(y2-y1):Math.abs(x2-x1))*.42);
    if(vertical){y1+=down?a.offsetHeight/2:-a.offsetHeight/2;y2+=down?-b.offsetHeight/2:b.offsetHeight/2;}else{x1+=right?a.offsetWidth/2:-a.offsetWidth/2;x2+=right?-b.offsetWidth/2:b.offsetWidth/2;}
    const mx=(x1+x2)/2,my=(y1+y2)/2;
    if(b.classList.contains('diamond')){const v=b.offsetWidth*(Math.SQRT1_2-.5);if(vertical)y2+=down?-v:v;else x2+=right?-v:v;}
    const path=document.createElementNS('http://www.w3.org/2000/svg','path'); path.setAttribute('class',`edge ${selectedEdge===index||multiEdges.has(index)?'selected':''}`); path.dataset.edge=index;
    path.addEventListener('click',event=>{
      event.stopPropagation();
      if(event.shiftKey){
        seedMultiSelection();
        const adding=!multiEdges.has(index);
        if(adding)multiEdges.add(index);else multiEdges.delete(index);
        if(!multiNodes.size&&!multiEdges.size){selected=null;selectedEdge=null;}
        else selectedEdge=adding?index:[...multiEdges][0]||null;
        render(); return;
      }
      clearMultiSelection();selectedEdge=index;selected=null;nodesEl.querySelectorAll('.node').forEach(node=>node.classList.remove('selected'));updateProperties();drawEdges();
    });
    path.addEventListener('contextmenu',event=>openEdgeMenu(event,index));
    path.setAttribute('d',vertical?`M ${x1} ${y1} C ${x1} ${y1+bend}, ${x2} ${y2-bend}, ${x2} ${y2}`:`M ${x1} ${y1} C ${x1+bend} ${y1}, ${x2-bend} ${y2}, ${x2} ${y2}`); edgesEl.appendChild(path);
    if(edge.label){ const text=document.createElementNS('http://www.w3.org/2000/svg','text'); text.setAttribute('class','edge-label'); text.setAttribute('x',mx); text.setAttribute('y',my-6); text.textContent=edge.label; text.dataset.mx=mx; text.dataset.my=my-6; text.addEventListener('click',event=>{
  event.stopPropagation();
  if(event.shiftKey){
    seedMultiSelection();
    const adding=!multiEdges.has(index);
    if(adding)multiEdges.add(index);else multiEdges.delete(index);
    if(!multiNodes.size&&!multiEdges.size){selected=null;selectedEdge=null;}
    else selectedEdge=adding?index:[...multiEdges][0]||null;
    render(); return;
  }
  clearMultiSelection();selectedEdge=index;selected=null;nodesEl.querySelectorAll('.node').forEach(node=>node.classList.remove('selected'));updateProperties();edgesEl.querySelectorAll('.edge').forEach(p=>p.classList.toggle('selected',+p.dataset.edge===index));
}); text.addEventListener('dblclick',event=>{event.preventDefault();event.stopPropagation();startEdgeLabelEdit(+text.dataset.mx,+text.dataset.my,index);}); text.addEventListener('contextmenu',event=>openEdgeMenu(event,index)); edgesEl.appendChild(text); }
  });
}

function selectNode(e){
  const id=e.currentTarget.dataset.id;
  if(suppressClickToggle){suppressClickToggle=false;return;}
  if(e.shiftKey){
    seedMultiSelection();
    const adding=!multiNodes.has(id);
    if(adding)multiNodes.add(id);else multiNodes.delete(id);
    if(!multiNodes.size&&!multiEdges.size){selected=null;selectedEdge=null;}
    else selected=adding?id:[...multiNodes][0]||null;
    render(); return;
  }
  clearMultiSelection();
  if(connecting){
    if(!source){ source=id; selected=id; selectedEdge=null; render(); return; }
    if(source!==id&&!edges.some(x=>x.from===source&&x.to===id)) edges.push({from:source,to:id,label:''});
    source=null; connecting=false; document.querySelector('#connectBtn').classList.remove('active'); render(); return;
  }
  selected=id; selectedEdge=null;
  nodesEl.querySelectorAll('.node').forEach(node=>node.classList.toggle('selected',node.dataset.id===id));
  edgesEl.querySelectorAll('.edge').forEach(edge=>edge.classList.remove('selected'));
  updateProperties();
}

function startDrag(e){
  if(e.button!==0||spaceDown||e.currentTarget.querySelector('[contenteditable="true"]'))return;
  e.currentTarget.setPointerCapture?.(e.pointerId);
  const el=e.currentTarget,id=el.dataset.id,n=nodeById(id),startX=e.clientX,startY=e.clientY,ox=n.x,oy=n.y;
  const group=multiNodes.has(id)?new Map([...multiNodes].map(id2=>{const m=nodeById(id2);return m?[id2,{x:m.x,y:m.y}]:null}).filter(Boolean)):null;
  if(!group&&!e.shiftKey){clearMultiSelection();selected=id;selectedEdge=null;nodesEl.querySelectorAll('.node').forEach(x=>x.classList.toggle('selected',x===el));edgesEl.querySelectorAll('.edge').forEach(edge=>edge.classList.remove('selected'));}
  else if(group){selected=id;selectedEdge=null;edgesEl.querySelectorAll('.edge').forEach(edge=>edge.classList.remove('selected'));}
  updateProperties();
  const move=ev=>{
    if(Math.abs(ev.clientX-startX)>3||Math.abs(ev.clientY-startY)>3)suppressClickToggle=true;
    let x=Math.round(ox+(ev.clientX-startX)/zoom);
    let y=Math.round(oy+(ev.clientY-startY)/zoom);
    if(ev.shiftKey){ x=Math.round(x/20)*20; y=Math.round(y/20)*20; }
    const dx=x-ox,dy=y-oy;
    if(group&&group.size>1){
      group.forEach((origin,id2)=>{const m=nodeById(id2);if(!m)return;m.x=Math.round(origin.x+dx);m.y=Math.round(origin.y+dy);const el2=document.querySelector(`[data-id="${id2}"]`);if(el2){el2.style.left=m.x+'px';el2.style.top=m.y+'px';}});
    }else{
      n.x=x; n.y=y; el.style.left=n.x+'px';el.style.top=n.y+'px';
    }
    drawEdges();positionSubgraphs();
  };
  const up=()=>{document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',up);setTimeout(()=>{suppressClickToggle=false;},0);};
  document.addEventListener('pointermove',move); document.addEventListener('pointerup',up);
}

function updateProperties(){
  const n=nodeById(selected), label=document.querySelector('#labelInput'), shape=document.querySelector('#shapeInput'), del=document.querySelector('#deleteBtn');
  document.querySelector('#selectedId').textContent=n?.id||'—'; label.disabled=shape.disabled=del.disabled=!n;
  if(n){ label.value=n.label; shape.value=n.shape; }
  syncCodeHighlight();
}

function syncCodeHighlight(){
  const lines=codeEditor.value.split('\n');
  const targets=multiNodes.size||multiEdges.size
    ?[...multiNodes].map(id=>({kind:'node',id})).concat([...multiEdges].map(index=>({kind:'edge',index})))
    :selectedEdge!==null?[{kind:'edge',index:selectedEdge}]:selected!==null?[{kind:'node',id:selected}]:[];
  const indexes=[];
  targets.forEach(target=>{
    if(target.kind==='edge'){
      const e=edges[target.index]; if(!e)return;
      const pattern=new RegExp(`^\\s*${e.from}\\s+-->\\s*(?:\\|[^|]*\\|\\s*)?${e.to}\\s*(?:[({[]|$)`);
      const index=lines.findIndex(line=>pattern.test(line));
      if(index>=0)indexes.push(index);
    }else{
      const pattern=new RegExp(`^\\s*${target.id}\\s*(?:[({[]|$)`);
      const index=lines.findIndex(line=>pattern.test(line));
      if(index>=0)indexes.push(index);
    }
  });
  codeHighlight.innerHTML='';
  [...new Set(indexes)].forEach(index=>{const bar=document.createElement('div');bar.className='code-highlight-line';bar.style.top=(10+index*17)+'px';codeHighlight.appendChild(bar);});
  applyHighlightTransform();
}

function applyHighlightTransform(){
  codeHighlight.style.width=Math.max(codeEditor.scrollWidth,codeEditor.clientWidth)+'px';
  codeHighlight.style.height=Math.max(codeEditor.scrollHeight,codeEditor.clientHeight)+'px';
  codeHighlight.style.transform=`translate(${-codeEditor.scrollLeft}px,${-codeEditor.scrollTop}px)`;
}
