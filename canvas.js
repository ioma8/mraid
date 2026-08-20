function render(syncCode=true){
  nodesEl.innerHTML = nodes.map(n=>`<div class="node ${n.shape} ${selected===n.id||multiNodes.has(n.id)?'selected':''} ${source===n.id?'connect-source':''}" data-id="${n.id}" style="left:${n.x}px;top:${n.y}px;width:${n.width||132}px${n.shape==='diamond'||n.shape==='circle'?`;height:${n.height||n.width||132}px`:''}"><span>${esc(n.label)}</span></div>`).join('');
  subgraphsEl.innerHTML = subgraphs.map((group,index)=>`<div class="subgraph ${selectedSubgraph===index||multiSubgraphs.has(index)?'selected':''}" data-subgraph="${index}"><span>${esc(group.label)}</span></div>`).join('');
  emptyState.style.display = nodes.length ? 'none' : 'flex';
  nodesEl.querySelectorAll('.node').forEach(el=>{ el.addEventListener('pointerdown',startDrag); el.addEventListener('click',selectNode); el.addEventListener('dblclick',startInlineEdit); el.addEventListener('contextmenu',openNodeMenu); });
  subgraphsEl.querySelectorAll('.subgraph').forEach(el=>{ el.addEventListener('pointerdown',startSubgraphDrag); el.addEventListener('click',event=>{event.stopPropagation();if(suppressClickToggle){suppressClickToggle=false;return;}selectSubgraph(+el.dataset.subgraph,event.shiftKey);}); el.addEventListener('dblclick',startSubgraphRename); el.addEventListener('contextmenu',event=>openSubgraphMenu(event,+el.dataset.subgraph)); });
  requestAnimationFrame(()=>{ positionSubgraphs(); drawEdges(); }); updateProperties(); if(syncCode){codeEditor.value = toMermaid();codeEditor.classList.remove('invalid');codeEditor.title='';} saveDocument(); syncCodeHighlight();
}

function openNodeMenu(event){
  event.preventDefault(); event.stopPropagation(); hideMenus(); window.getSelection()?.removeAllRanges();
  const id=event.currentTarget.dataset.id;
  if(multiNodes.has(id)){selected=id;selectedEdge=null;selectedSubgraph=null;}
  else selectOnly('node',id);
  updateProperties();
  nodeMenu.style.left=`${event.clientX}px`; nodeMenu.style.top=`${event.clientY}px`; nodeMenu.classList.add('open');
}
function nextSubgraphLabel(){let n=subgraphs.length+1;while(subgraphs.some(g=>g.label===`Subgraph ${n}`))n++;return`Subgraph ${n}`;}
const NODE_W=132,NODE_H=48;
function makeNode(x,y){const id=nextNodeId();nodes.push({id,label:'New node',x,y,width:NODE_W,height:NODE_H,shape:'round'});return id;}
function addNode(){record();const id=makeNode(100+(nodes.length%3)*220,100+(nodes.length%3)*110);clearSelection();selected=id;render();}
function addNodeToSubgraph(index){
  const group=subgraphs[index];if(!group||!group.bounds)return;
  record();
  const id=makeNode(Math.round(group.bounds.x+group.bounds.width/2-NODE_W/2),Math.round(group.bounds.y+group.bounds.height/2-NODE_H/2));
  group.members.push(id);
  clearSelection();selected=id;render();
}
function openCanvasMenu(event){
  event.preventDefault();event.stopPropagation();hideMenus();window.getSelection()?.removeAllRanges();
  canvasMenu.style.left=`${event.clientX}px`;canvasMenu.style.top=`${event.clientY}px`;canvasMenu.classList.add('open');
}
function addSubgraph(){
  record();
  const center=currentViewCenter();
  subgraphs.push({label:nextSubgraphLabel(),members:[],bounds:{x:Math.round(center.x-160),y:Math.round(center.y-90),width:320,height:180}});
  clearSelection();selectedSubgraph=subgraphs.length-1;render();
}
function groupIntoSubgraph(){
  const ids=multiNodes.size?[...multiNodes]:selected!==null?[selected]:[]; if(!ids.length)return;
  record();
  subgraphs.forEach(g=>ids.forEach(id=>{const at=g.members.indexOf(id);if(at>=0)g.members.splice(at,1);}));
  subgraphs.push({label:nextSubgraphLabel(),members:ids});
  clearSelection();selectedSubgraph=subgraphs.length-1;relayout();
}

function openEdgeMenu(event,index){
  event.preventDefault(); event.stopPropagation(); hideMenus(); selectOnly('edge',index);
  edgeMenu.querySelector('[data-action="add-label"]').style.display=edges[index].label?'none':'';
  edgeMenu.querySelector('[data-action="remove-label"]').style.display=edges[index].label?'':'none';
  edgeMenu.style.left=`${event.clientX}px`; edgeMenu.style.top=`${event.clientY}px`; edgeMenu.classList.add('open'); syncCodeHighlight();
}

function startInlineEdit(event){
  event.preventDefault(); event.stopPropagation();
  const node=nodeById(event.currentTarget.dataset.id),field=event.currentTarget.querySelector('span');
  selectOnly('node',node.id); inlineEdit(field,node.label,recordEdit(node,'label'));
}

function startEdgeLabelEdit(mx,my,index){
  selectOnly('edge',index);
  const edge=edges[index],el=document.createElement('div');
  el.className='edge-label-editing'; el.textContent=edge.label; el.contentEditable='true';
  el.style.left=mx+'px'; el.style.top=my+'px';
  canvas.appendChild(el);
  inlineEdit(el,edge.label,recordEdit(edge,'label'),()=>el.remove());
}

function clearMultiSelection(){multiNodes.clear();multiEdges.clear();multiSubgraphs.clear();}
function clearSelection(){clearMultiSelection();selected=null;selectedEdge=null;selectedSubgraph=null;}
function seedMultiSelection(){if(selected!==null&&!multiNodes.has(selected))multiNodes.add(selected);if(selectedEdge!==null&&!multiEdges.has(selectedEdge))multiEdges.add(selectedEdge);if(selectedSubgraph!==null&&!multiSubgraphs.has(selectedSubgraph))multiSubgraphs.add(selectedSubgraph);}
function toggleMulti(set,key,setPrimary,first){
  const adding=!set.has(key);
  if(adding)set.add(key);else set.delete(key);
  if(!multiNodes.size&&!multiEdges.size&&!multiSubgraphs.size)clearSelection();
  else setPrimary(adding?key:first());
  render();
}
function clearSelectionClasses(){nodesEl.querySelectorAll('.node').forEach(n=>n.classList.remove('selected'));edgesEl.querySelectorAll('.edge').forEach(e=>e.classList.remove('selected'));subgraphsEl.querySelectorAll('.subgraph').forEach(b=>b.classList.remove('selected'));}
const selectors={node:{els:()=>nodesEl.querySelectorAll('.node'),key:el=>el.dataset.id,set:v=>selected=v},edge:{els:()=>edgesEl.querySelectorAll('.edge'),key:el=>+el.dataset.edge,set:v=>selectedEdge=v},subgraph:{els:()=>subgraphsEl.querySelectorAll('.subgraph'),key:el=>+el.dataset.subgraph,set:v=>selectedSubgraph=v}};
function selectOnly(kind,key){clearSelection();const s=selectors[kind];s.set(key);clearSelectionClasses();s.els().forEach(el=>el.classList.toggle('selected',s.key(el)===key));}
function recordEdit(obj,key){return value=>{if(value!==obj[key]){record();obj[key]=value;}};}
function inlineEdit(field,original,commit,cleanup){
  field.contentEditable='true';field.classList.add('inline-editing');field.focus();
  const selection=window.getSelection();selection?.selectAllChildren(field);
  const finish=ok=>{
    if(!field.isContentEditable)return;
    const value=field.textContent.trim();field.contentEditable='false';field.classList.remove('inline-editing');
    if(ok&&value)commit(value);else field.textContent=original;
    cleanup?.();
    render();
  };
  field.onblur=()=>finish(true);
  field.onkeydown=keyEvent=>{
    if(keyEvent.key==='Escape'){keyEvent.preventDefault();finish(false);}
    if(keyEvent.key==='Enter'){keyEvent.preventDefault();finish(true);}
  };
}
function selectionTargets(){
  if(multiNodes.size||multiEdges.size||multiSubgraphs.size)return[...multiNodes].map(id=>({kind:'node',id})).concat([...multiEdges].map(index=>({kind:'edge',index})),[...multiSubgraphs].map(index=>({kind:'subgraph',index})));
  if(selectedSubgraph!==null)return[{kind:'subgraph',index:selectedSubgraph}];
  if(selectedEdge!==null)return[{kind:'edge',index:selectedEdge}];
  if(selected!==null)return[{kind:'node',id:selected}];
  return[];
}
function applyViewport(){ canvas.style.transform=`translate(${panX}px,${panY}px) scale(${zoom})`; canvasWrap.style.backgroundPosition=`${panX+gridPanX}px ${panY+gridPanY}px`; canvasWrap.style.backgroundSize=`${20*zoom}px ${20*zoom}px`; document.querySelector('#zoomLabel').textContent=Math.round(zoom*100)+'%'; }
function currentViewCenter(){ return {x:(canvasWrap.clientWidth-2*panX)/(2*zoom),y:(canvasWrap.clientHeight-2*panY)/(2*zoom)}; }
function setZoom(value){ zoom=Math.min(2,Math.max(.5,value)); applyViewport(); }
function relayout(){const ref=nodes[0],before=ref&&Number.isFinite(ref.x)&&Number.isFinite(ref.y)?{id:ref.id,x:ref.x,y:ref.y}:null;const laidOut=layoutDiagram({direction,nodes,edges,subgraphs},currentViewCenter());const after=before&&laidOut.nodes.find(n=>n.id===before.id);if(after){gridPanX+=(after.x-before.x)*zoom;gridPanY+=(after.y-before.y)*zoom;}nodes=laidOut.nodes;edges=laidOut.edges;subgraphs=laidOut.subgraphs;render();applyViewport();}
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
    const shift=ev.shiftKey;
    if(Math.abs(x-sx)<3&&Math.abs(y-sy)<3){if(!shift){clearSelection();render();}return;}
    const left=Math.min(sx,x),top=Math.min(sy,y),right=Math.max(sx,x),bottom=Math.max(sy,y),ids=[],edgeIndexes=[],subgraphIndexes=[];
    nodes.forEach(n=>{if(n.x<right&&n.x+n.width>left&&n.y<bottom&&n.y+n.height>top)ids.push(n.id);});
    edges.forEach((edge,index)=>{
      const from=nodeById(edge.from),to=nodeById(edge.to); if(!from||!to)return;
      const mx=(from.x+from.width/2+to.x+to.width/2)/2,my=(from.y+from.height/2+to.y+to.height/2)/2;
      if(mx>left&&mx<right&&my>top&&my<bottom)edgeIndexes.push(index);
    });
    subgraphs.forEach((group,index)=>{const b=group.bounds;if(b&&b.x<right&&b.x+b.width>left&&b.y<bottom&&b.y+b.height>top)subgraphIndexes.push(index);});
    if(shift)seedMultiSelection();else clearSelection();
    ids.forEach(id=>multiNodes.add(id));
    edgeIndexes.forEach(index=>multiEdges.add(index));
    subgraphIndexes.forEach(index=>multiSubgraphs.add(index));
    if(shift){
      if(selected===null&&multiNodes.size)selected=[...multiNodes][0];
      if(selectedEdge===null&&multiEdges.size)selectedEdge=[...multiEdges][0];
      if(selectedSubgraph===null&&multiSubgraphs.size)selectedSubgraph=[...multiSubgraphs][0];
    }else{
      selected=ids[0]||null; selectedEdge=edgeIndexes.length?edgeIndexes[0]:null; selectedSubgraph=subgraphIndexes.length?subgraphIndexes[0]:null;
    }
    render();
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
  if(event.button===0&&!event.target.closest('.node,.edge,.edge-hit,.edge-label,.subgraph'))startMarquee(event);
});
canvasWrap.addEventListener('contextmenu',openCanvasMenu);
canvasWrap.addEventListener('wheel',event=>{
  if(!event.altKey)return;
  event.preventDefault();
  const rect=canvasWrap.getBoundingClientRect();
  const viewportX=event.clientX-rect.left+canvasWrap.scrollLeft,viewportY=event.clientY-rect.top+canvasWrap.scrollTop;
  const pointX=(viewportX-panX)/zoom,pointY=(viewportY-panY)/zoom;
  const next=Math.min(2,Math.max(.5,zoom*(event.deltaY<0?1.1:.9)));
  panX=viewportX-pointX*next;panY=viewportY-pointY*next;zoom=next;applyViewport();
},{passive:false});

function selectEdge(index,shift){
  if(shift){seedMultiSelection();toggleMulti(multiEdges,index,v=>selectedEdge=v,()=>[...multiEdges][0]??null);return;}
  clearSelection();selectedEdge=index;clearSelectionClasses();updateProperties();drawEdges();
}
function selectSubgraph(index,shift){
  if(shift){seedMultiSelection();toggleMulti(multiSubgraphs,index,v=>selectedSubgraph=v,()=>[...multiSubgraphs][0]??null);return;}
  selectOnly('subgraph',index);updateProperties();
}
let activeDragHandlers=null;
function cancelActiveDrag(){if(activeDragHandlers){document.removeEventListener('pointermove',activeDragHandlers.move);document.removeEventListener('pointerup',activeDragHandlers.up);activeDragHandlers=null;suppressClickToggle=false;}}
function markDragMove(ev,startX,startY,state){if(Math.abs(ev.clientX-startX)>3||Math.abs(ev.clientY-startY)>3){suppressClickToggle=true;if(!state.recorded){state.recorded=true;record();}}}
function startSubgraphDrag(e){
  if(e.button!==0||spaceDown)return;
  const index=+e.currentTarget.dataset.subgraph;
  e.currentTarget.setPointerCapture?.(e.pointerId);
  const multi=multiSubgraphs.has(index);
  if(!e.shiftKey&&!multi){selectOnly('subgraph',index);updateProperties();}
  const ids=new Set();
  [...multiSubgraphs].forEach(i=>subgraphs[i]?.members.forEach(m=>ids.add(m)));
  if(multiSubgraphs.size||multiNodes.size)[...multiNodes].forEach(id=>ids.add(id));
  if(!ids.size)subgraphs[index].members.forEach(m=>ids.add(m));
  const origins=new Map([...ids].map(id=>{const m=nodeById(id);return m?[id,{x:m.x,y:m.y}]:null}).filter(Boolean));
  const boundsOrigins=!origins.size?new Map([...multiSubgraphs,index].map(i=>{const g=subgraphs[i];return g&&g.bounds?[i,{x:g.bounds.x,y:g.bounds.y}]:null}).filter(Boolean)):null;
  const startX=e.clientX,startY=e.clientY,dragState={recorded:false};
  const move=ev=>{
    markDragMove(ev,startX,startY,dragState);
    let dx=Math.round((ev.clientX-startX)/zoom),dy=Math.round((ev.clientY-startY)/zoom);
    if(ev.shiftKey){dx=Math.round(dx/20)*20;dy=Math.round(dy/20)*20;}
    if(boundsOrigins){boundsOrigins.forEach((o,i)=>{const g=subgraphs[i];g.bounds.x=o.x+dx;g.bounds.y=o.y+dy;});}
    else origins.forEach((origin,id)=>{const m=nodeById(id);if(!m)return;m.x=Math.round(origin.x+dx);m.y=Math.round(origin.y+dy);const el=document.querySelector(`[data-id="${id}"]`);if(el){el.style.left=m.x+'px';el.style.top=m.y+'px';}});
    positionSubgraphs();drawEdges();
  };
  const up=()=>{activeDragHandlers=null;document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',up);if(dragState.recorded){saveDocument();dropLastIfUnchanged();}setTimeout(()=>{suppressClickToggle=false;},0);};
  activeDragHandlers={move,up};
  document.addEventListener('pointermove',move);document.addEventListener('pointerup',up);
}
function startSubgraphRename(event){
  event.preventDefault();event.stopPropagation();
  const index=+event.currentTarget.dataset.subgraph,group=subgraphs[index],field=event.currentTarget.querySelector('span');
  selectOnly('subgraph',index);
  inlineEdit(field,group.label,recordEdit(group,'label'));
}
function openSubgraphMenu(event,index){
  event.preventDefault();event.stopPropagation();hideMenus();
  selectOnly('subgraph',index);updateProperties();
  subgraphMenu.style.left=`${event.clientX}px`;subgraphMenu.style.top=`${event.clientY}px`;subgraphMenu.classList.add('open');
}
function positionSubgraphs(skip=[]){
  subgraphs.forEach((group,index)=>{
    if(skip.includes(index))return;
    const box=subgraphsEl.children[index]; if(!box)return;
    const members=group.members.map(nodeById).filter(Boolean);
    if(!members.length){ if(group.bounds)Object.assign(box.style,{left:`${group.bounds.x}px`,top:`${group.bounds.y}px`,width:`${group.bounds.width}px`,height:`${group.bounds.height}px`}); return; }
    const boxes=members.map(n=>document.querySelector(`[data-id="${n.id}"]`));
    const left=Math.min(...members.map(n=>n.x))-28, top=Math.min(...members.map(n=>n.y))-42;
    const right=Math.max(...members.map((n,i)=>n.x+(boxes[i]?.offsetWidth||NODE_W)))+28, bottom=Math.max(...members.map((n,i)=>n.y+(boxes[i]?.offsetHeight||NODE_H)))+28;
    group.bounds={x:left,y:top,width:right-left,height:bottom-top};
    Object.assign(box.style,{left:`${left}px`,top:`${top}px`,width:`${right-left}px`,height:`${bottom-top}px`});
  });
}

function drawEdges(){
  edgesEl.querySelectorAll('.edge,.edge-hit,.edge-label').forEach(e=>e.remove());
  edges.forEach((edge,index)=>{
    const from=nodeById(edge.from),to=nodeById(edge.to); if(!from||!to)return;
    const a=document.querySelector(`[data-id="${from.id}"]`),b=document.querySelector(`[data-id="${to.id}"]`); if(!a||!b)return;
    let x1=from.x+a.offsetWidth/2,y1=from.y+a.offsetHeight/2,x2=to.x+b.offsetWidth/2,y2=to.y+b.offsetHeight/2;
    const vertical=direction==='TB'||direction==='TD'||direction==='BT',down=y2>=y1,right=x2>=x1,bend=Math.max(40,(vertical?Math.abs(y2-y1):Math.abs(x2-x1))*.42);
    if(vertical){y1+=down?a.offsetHeight/2:-a.offsetHeight/2;y2+=down?-b.offsetHeight/2:b.offsetHeight/2;}else{x1+=right?a.offsetWidth/2:-a.offsetWidth/2;x2+=right?-b.offsetWidth/2:b.offsetWidth/2;}
    const mx=(x1+x2)/2,my=(y1+y2)/2;
    if(b.classList.contains('diamond')){const v=b.offsetWidth*(Math.SQRT1_2-.5);if(vertical)y2+=down?-v:v;else x2+=right?-v:v;}
    const d=vertical?`M ${x1} ${y1} C ${x1} ${y1+bend}, ${x2} ${y2-bend}, ${x2} ${y2}`:`M ${x1} ${y1} C ${x1+bend} ${y1}, ${x2-bend} ${y2}, ${x2} ${y2}`;
    const hit=document.createElementNS('http://www.w3.org/2000/svg','path'); hit.setAttribute('class','edge-hit'); hit.dataset.edge=index;
    hit.addEventListener('click',event=>{event.stopPropagation();selectEdge(index,event.shiftKey);});
    hit.addEventListener('contextmenu',event=>openEdgeMenu(event,index));
    hit.setAttribute('d',d); edgesEl.appendChild(hit);
    const path=document.createElementNS('http://www.w3.org/2000/svg','path'); path.setAttribute('class',`edge ${selectedEdge===index||multiEdges.has(index)?'selected':''}`); path.dataset.edge=index; path.setAttribute('d',d); edgesEl.appendChild(path);
    if(edge.label){ const text=document.createElementNS('http://www.w3.org/2000/svg','text'); text.setAttribute('class','edge-label'); text.setAttribute('x',mx); text.setAttribute('y',my-6); text.textContent=edge.label; text.addEventListener('click',event=>{event.stopPropagation();selectEdge(index,event.shiftKey);}); text.addEventListener('dblclick',event=>{event.preventDefault();event.stopPropagation();startEdgeLabelEdit(mx,my-6,index);}); text.addEventListener('contextmenu',event=>openEdgeMenu(event,index)); edgesEl.appendChild(text); }
  });
}

function selectNode(e){
  const id=e.currentTarget.dataset.id;
  if(suppressClickToggle){suppressClickToggle=false;return;}
  if(e.shiftKey){seedMultiSelection();toggleMulti(multiNodes,id,v=>selected=v,()=>[...multiNodes][0]??null);return;}
  clearSelection();
  if(connecting){
    if(!source){ source=id; selected=id; render(); return; }
    if(source!==id&&!edges.some(x=>x.from===source&&x.to===id)){record();edges.push({from:source,to:id,label:''});}
    source=null; connecting=false; document.querySelector('#connectBtn').classList.remove('active'); render(); return;
  }
  selectOnly('node',id);updateProperties();
}

function startDrag(e){
  if(e.button!==0||spaceDown||e.currentTarget.querySelector('[contenteditable="true"]'))return;
  e.currentTarget.setPointerCapture?.(e.pointerId);
  const el=e.currentTarget,id=el.dataset.id,n=nodeById(id),startX=e.clientX,startY=e.clientY,ox=n.x,oy=n.y,dragState={recorded:false};
  const group=multiNodes.has(id)?new Map([...multiNodes].map(id2=>{const m=nodeById(id2);return m?[id2,{x:m.x,y:m.y}]:null}).filter(Boolean)):null;
  const dragging=new Set(group?[...multiNodes]:[id]),frozen=[];subgraphs.forEach((g,i)=>{if(g.members.some(m=>dragging.has(m)))frozen.push(i);});
  if(!group&&!e.shiftKey){clearSelection();selected=id;clearSelectionClasses();nodesEl.querySelectorAll('.node').forEach(x=>x.classList.toggle('selected',x===el));}
  else if(group){selected=id;selectedEdge=null;selectedSubgraph=null;edgesEl.querySelectorAll('.edge').forEach(edge=>edge.classList.remove('selected'));subgraphsEl.querySelectorAll('.subgraph').forEach(box=>box.classList.remove('selected'));}
  updateProperties();
  const move=ev=>{
    markDragMove(ev,startX,startY,dragState);
    let x=Math.round(ox+(ev.clientX-startX)/zoom);
    let y=Math.round(oy+(ev.clientY-startY)/zoom);
    if(ev.shiftKey){ x=Math.round(x/20)*20; y=Math.round(y/20)*20; }
    const dx=x-ox,dy=y-oy;
    if(group&&group.size>1){
      group.forEach((origin,id2)=>{const m=nodeById(id2);if(!m)return;m.x=Math.round(origin.x+dx);m.y=Math.round(origin.y+dy);const el2=document.querySelector(`[data-id="${id2}"]`);if(el2){el2.style.left=m.x+'px';el2.style.top=m.y+'px';}});
    }else{
      n.x=x; n.y=y; el.style.left=n.x+'px';el.style.top=n.y+'px';
    }
    drawEdges();positionSubgraphs(frozen);
  };
  const up=()=>{
    activeDragHandlers=null;
    document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',up);
    if(suppressClickToggle){
      let changed=false;
      dragging.forEach(id2=>{
        const m=nodeById(id2);if(!m)return;
        const mx=m.x+(m.width||NODE_W)/2,my=m.y+(m.height||NODE_H)/2;let target=-1;
        subgraphs.forEach((g,i)=>{const b=g.bounds;if(b&&mx>b.x&&mx<b.x+b.width&&my>b.y&&my<b.y+b.height)target=i;});
        if(target>=0&&!subgraphs[target].members.includes(id2)){subgraphs[target].members.push(id2);changed=true;}
        subgraphs.forEach((g,i)=>{if(i!==target){const at=g.members.indexOf(id2);if(at>=0){g.members.splice(at,1);changed=true;}}});
      });
      if(changed)render();else{positionSubgraphs();saveDocument();} // no full render on drag end: rewriting the code editor can re-trigger applyMermaid in WKWebView
      if(dragState.recorded)dropLastIfUnchanged();
    }
    setTimeout(()=>{suppressClickToggle=false;},0);
  };
  activeDragHandlers={move,up};
  document.addEventListener('pointermove',move); document.addEventListener('pointerup',up);
}

function updateProperties(){
  const n=nodeById(selected), label=document.querySelector('#labelInput'), shape=document.querySelector('#shapeInput'), del=document.querySelector('#deleteBtn');
  document.querySelector('#selectedId').textContent=selectedSubgraph!==null?(subgraphs[selectedSubgraph]?.label||'Subgraph'):n?.id||'—'; label.disabled=shape.disabled=!n; del.disabled=!n&&selectedSubgraph===null;
  if(n){ label.value=n.label; shape.value=n.shape; }else{ label.value=''; shape.value='round'; }
  syncCodeHighlight();
}

function syncCodeHighlight(){
  const lines=codeEditor.value.split('\n');
  const targets=selectionTargets();
  const indexes=[];
  targets.forEach(target=>{
    if(target.kind==='edge'){
      const e=edges[target.index]; if(!e)return;
      const pattern=new RegExp(`^\\s*${e.from}\\s+-->\\s*(?:\\|[^|]*\\|\\s*)?${e.to}\\s*(?:[({[]|$)`);
      const index=lines.findIndex(line=>pattern.test(line));
      if(index>=0)indexes.push(index);
    }else if(target.kind==='subgraph'){
      const g=subgraphs[target.index]; if(!g)return;
      const pattern=new RegExp(`^\\s*subgraph\\s+${escRegex(g.label)}\\s*$`);
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
