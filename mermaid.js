function unquote(value){
  value=value.trim();
  return value.length>1&&((value[0]==='"'&&value.at(-1)==='"')||(value[0]==="'"&&value.at(-1)==="'"))?value.slice(1,-1):value;
}
function shapeFromToken(token){
  if(token.startsWith('([')) return ['pill',unquote(token.slice(2,-2))];
  if(token.startsWith('{{')) return ['diamond',unquote(token.slice(2,-2))];
  if(token.startsWith('((')) return ['circle',unquote(token.slice(2,-2))];
  if(token.startsWith('[')) return ['square',unquote(token.slice(1,-1))];
  return ['round',unquote(token.slice(1,-1))];
}
function parseDiagram(source){
  const diagram={direction:(source.match(/^(?:flowchart|graph)\s+(TB|TD|BT|RL|LR)/im)||[])[1]||'LR',nodes:[],edges:[],subgraphs:[]};
  const byId=new Map(), stack=[];
  const token='(?:\\(\\[.*?\\]\\)|\\{\\{.*?\\}\\}|\\(\\(.*?\\)\\)|\\[.*?\\]|\\(.*?\\))';
  const ensure=(id,label=id,shape='round',member=true)=>{
    let node=byId.get(id);
    if(!node){ node={id,label,shape,x:0,y:0}; byId.set(id,node); diagram.nodes.push(node); }
    if(member&&stack.length&&!stack.at(-1).members.includes(id)) stack.at(-1).members.push(id);
    return node;
  };
  source.split(/\r?\n/).forEach(raw=>{
    const line=raw.trim(); if(!line||/^(?:flowchart|graph)\s/i.test(line)||line==='end') { if(line==='end') stack.pop(); return; }
    const group=line.match(/^subgraph\s+(.*)$/i);
    if(group){ const sub={label:unquote(group[1]),members:[],depth:stack.length}; diagram.subgraphs.push(sub); stack.push(sub); return; }
    const edge=line.match(new RegExp(`^([A-Za-z_]\\w*)\\s*(${token})?\\s*[-.=]+>\\s*(?:\\|([^|]*)\\|\\s*)?([A-Za-z_]\\w*)\\s*(${token})?`));
    if(edge){
      const from=ensure(edge[1],edge[1],'round',Boolean(edge[2])), to=ensure(edge[4],edge[4],'round',Boolean(edge[5]));
      if(edge[2]) [from.shape,from.label]=shapeFromToken(edge[2]);
      if(edge[5]) [to.shape,to.label]=shapeFromToken(edge[5]);
      diagram.edges.push({from:edge[1],to:edge[4],label:edge[3]||''}); return;
    }
    const definition=line.match(/^([A-Za-z_]\w*)\s*(\(\[.*\]\)|\{\{.*\}\}|\(\(.*\)\)|\[.*\]|\(.*\))$/);
    if(definition){ const [shape,label]=shapeFromToken(definition[2]); const node=ensure(definition[1],label,shape); node.label=label; node.shape=shape; }
  });
  return diagram;
}
function layoutDiagram(diagram){
  if(diagram.subgraphs?.length)return layoutCompound(diagram);
  const components=connectedComponents(diagram);
  if(components.length>1)return layoutComponents(diagram,components);
  const ranks=new Map(diagram.nodes.map(n=>[n.id,0])), incoming=new Map(diagram.nodes.map(n=>[n.id,0])), outgoing=new Map();
  diagram.edges.forEach(e=>{incoming.set(e.to,(incoming.get(e.to)||0)+1);if(!outgoing.has(e.from))outgoing.set(e.from,[]);outgoing.get(e.from).push(e.to);});
  const visit=(id,level,path=new Set())=>{ranks.set(id,Math.max(ranks.get(id)||0,level));if(path.has(id))return;const next=new Set(path);next.add(id);(outgoing.get(id)||[]).forEach(to=>visit(to,level+1,next));};
  diagram.nodes.filter(n=>!incoming.get(n.id)).forEach(n=>visit(n.id,0));
  diagram.nodes.forEach(n=>{if(!incoming.get(n.id))return;if(!ranks.get(n.id))visit(n.id,0);});
  const layers=new Map(); diagram.nodes.forEach(n=>{const rank=ranks.get(n.id)||0;if(!layers.has(rank))layers.set(rank,[]);layers.get(rank).push(n);});
  const position=new Map();
  const reorder=(rank,near,forward)=>{
    const layer=layers.get(rank)||[], reference=layers.get(near)||[]; reference.forEach((node,index)=>position.set(node.id,index));
    layer.forEach((node,index)=>position.set(node.id,index));
    layer.sort((a,b)=>{
      const average=node=>{
        const neighbors=diagram.edges.filter(edge=>forward?edge.to===node.id&&ranks.get(edge.from)===near:edge.from===node.id&&ranks.get(edge.to)===near).map(edge=>position.get(forward?edge.from:edge.to)).filter(Number.isFinite);
        return neighbors.length?neighbors.reduce((sum,value)=>sum+value,0)/neighbors.length:position.get(node.id);
      };
      return average(a)-average(b);
    });
  };
  const maxRank=Math.max(...layers.keys(),0);
  for(let pass=0;pass<4;pass++){for(let rank=1;rank<=maxRank;rank++)reorder(rank,rank-1,true);for(let rank=maxRank-1;rank>=0;rank--)reorder(rank,rank+1,false);}
  const vertical=diagram.direction==='TB'||diagram.direction==='TD'||diagram.direction==='BT';
  diagram.nodes.forEach(n=>{n.width=n.width||Math.min(300,Math.max(132,n.label.length*7+36));n.height=n.height||Math.max(48,Math.ceil((n.label.length*7+36)/300)*18+24);});
  const crossSize=n=>vertical?n.width:n.height, majorSize=n=>vertical?n.height:n.width;
  const rankSizes=[...layers.keys()].sort((a,b)=>a-b).map(rank=>{const items=layers.get(rank);return {rank,items,major:Math.max(...items.map(majorSize)),cross:items.reduce((sum,n)=>sum+crossSize(n),0)+(items.length-1)*60};});
  const maxCross=Math.max(...rankSizes.map(size=>size.cross),0);
  rankSizes.forEach(size=>{let crossOffset=(maxCross-size.cross)/2+30;size.items.forEach(node=>{node._cross=crossOffset;crossOffset+=crossSize(node)+60;});});
  const align=(rank,near,forward)=>{
    const layer=layers.get(rank)||[], reference=layers.get(near)||[], index=new Map(reference.map((node,i)=>[node.id,i]));
    let cursor=30; const desiredCenters=[];
    layer.forEach(node=>{
      const neighbors=diagram.edges.filter(edge=>forward?edge.to===node.id&&ranks.get(edge.from)===near:edge.from===node.id&&ranks.get(edge.to)===near).map(edge=>forward?edge.from:edge.to).map(id=>reference[index.get(id)]).filter(Boolean);
      const desired=neighbors.length?neighbors.reduce((sum,item)=>sum+item._cross+crossSize(item)/2,0)/neighbors.length:node._cross+crossSize(node)/2;
      desiredCenters.push(desired);
      node._cross=Math.max(cursor,desired-crossSize(node)/2); cursor=node._cross+crossSize(node)+60;
    });
    if(layer.length){const actual=layer.reduce((sum,node)=>sum+node._cross+crossSize(node)/2,0)/layer.length;const desired=desiredCenters.reduce((sum,value)=>sum+value,0)/layer.length;const delta=desired-actual;layer.forEach(node=>node._cross+=delta);const min=Math.min(...layer.map(node=>node._cross));if(min<30)layer.forEach(node=>node._cross+=30-min);}
  };
  for(let pass=0;pass<4;pass++){for(let rank=1;rank<=maxRank;rank++)align(rank,rank-1,true);for(let rank=maxRank-1;rank>=0;rank--)align(rank,rank+1,false);}
  let majorOffset=70;rankSizes.forEach(size=>{size.items.forEach(node=>{if(vertical){node.x=node._cross;node.y=majorOffset;}else{node.x=majorOffset;node.y=node._cross;}});majorOffset+=size.major+80;});
  if(diagram.direction==='BT') diagram.nodes.forEach(n=>n.y=-n.y);
  if(diagram.direction==='RL') diagram.nodes.forEach(n=>n.x=-n.x);
  const minX=Math.min(...diagram.nodes.map(n=>n.x),0),minY=Math.min(...diagram.nodes.map(n=>n.y),0);diagram.nodes.forEach(n=>{n.x-=minX-30;n.y-=minY-30;});
  return diagram;
}
function connectedComponents(diagram){
  const links=new Map(diagram.nodes.map(node=>[node.id,[]]));
  diagram.edges.forEach(edge=>{links.get(edge.from)?.push(edge.to);links.get(edge.to)?.push(edge.from);});
  const seen=new Set(),components=[];
  diagram.nodes.forEach(node=>{if(seen.has(node.id))return;const ids=new Set(),queue=[node.id];seen.add(node.id);while(queue.length){const id=queue.pop();ids.add(id);(links.get(id)||[]).forEach(next=>{if(!seen.has(next)){seen.add(next);queue.push(next);}});}components.push(ids);});
  return components;
}

function layoutComponents(diagram,components){
  const vertical=diagram.direction==='TB'||diagram.direction==='TD'||diagram.direction==='BT',packed=[],gap=140;
  components.forEach(ids=>{const nodes=diagram.nodes.filter(node=>ids.has(node.id)),edges=diagram.edges.filter(edge=>ids.has(edge.from)&&ids.has(edge.to));const part=layoutDiagram({direction:diagram.direction,nodes,edges,subgraphs:[]});const minX=Math.min(...nodes.map(node=>node.x),0),minY=Math.min(...nodes.map(node=>node.y),0),maxX=Math.max(...nodes.map(node=>node.x+node.width),0),maxY=Math.max(...nodes.map(node=>node.y+node.height),0);packed.push({nodes,width:maxX-minX,height:maxY-minY,minX,minY});});
  let offset=30;packed.forEach(part=>{part.nodes.forEach(node=>{node.x+=30-part.minX+(vertical?offset:0);node.y+=30-part.minY+(vertical?0:offset);});offset+=(vertical?part.width:part.height)+gap;});
  return diagram;
}

function layoutCompound(diagram){
  const grouped=new Set(diagram.subgraphs.flatMap(group=>group.members));
  const outerNodes=diagram.nodes.filter(node=>!grouped.has(node.id));
  const outerEdges=diagram.edges.filter(edge=>!grouped.has(edge.from)&&!grouped.has(edge.to));
  layoutDiagram({direction:diagram.direction,nodes:outerNodes,edges:outerEdges,subgraphs:[]});
  const groups=[];
  diagram.subgraphs.forEach((group,index)=>{
    const members=diagram.nodes.filter(node=>group.members.includes(node.id));
    const innerEdges=diagram.edges.filter(edge=>group.members.includes(edge.from)&&group.members.includes(edge.to));
    layoutDiagram({direction:diagram.direction,nodes:members,edges:innerEdges,subgraphs:[]});
    const minX=Math.min(...members.map(node=>node.x),0),minY=Math.min(...members.map(node=>node.y),0),maxX=Math.max(...members.map(node=>node.x+node.width),0),maxY=Math.max(...members.map(node=>node.y+node.height),0);
    groups.push({group,members,minX,minY,width:maxX-minX+56,height:maxY-minY+56});
  });
  const vertical=diagram.direction==='TB'||diagram.direction==='TD'||diagram.direction==='BT';
  groups.forEach(({group,members,minX,minY,width,height})=>{
    const incoming=diagram.edges.filter(edge=>group.members.includes(edge.to)&&!grouped.has(edge.from)).map(edge=>nodeByDiagramId(outerNodes,edge.from)).filter(Boolean);
    const outgoing=diagram.edges.filter(edge=>group.members.includes(edge.from)&&!grouped.has(edge.to)).map(edge=>nodeByDiagramId(outerNodes,edge.to)).filter(Boolean);
    let x=30,y=30;
    if(vertical&&incoming.length){x=incoming.reduce((sum,node)=>sum+node.x+node.width/2,0)/incoming.length-width/2;y=Math.max(...incoming.map(node=>node.y+node.height))+120;}
    else if(vertical&&outgoing.length){x=outgoing.reduce((sum,node)=>sum+node.x+node.width/2,0)/outgoing.length-width/2;y=Math.min(...outgoing.map(node=>node.y))-height-120;}
    else if(!vertical&&incoming.length){x=Math.max(...incoming.map(node=>node.x+node.width))+120;y=incoming.reduce((sum,node)=>sum+node.y+node.height/2,0)/incoming.length-height/2;}
    else if(!vertical&&outgoing.length){x=Math.min(...outgoing.map(node=>node.x))-width-120;y=outgoing.reduce((sum,node)=>sum+node.y+node.height/2,0)/outgoing.length-height/2;}
    else {const right=Math.max(...outerNodes.map(node=>node.x+node.width),30);x=vertical?right+160:30;y=vertical?30:Math.max(...outerNodes.map(node=>node.y+node.height),30)+160;}
    members.forEach(node=>{node.x+=x-minX+28;node.y+=y-minY+42;}); group.bounds={x,y,width,height};
  });
  diagram.nodes=outerNodes.concat(groups.flatMap(item=>item.members));
  return diagram;
}

function nodeByDiagramId(nodes,id){return nodes.find(node=>node.id===id);}

function applyMermaid(source){
  const diagram=layoutDiagram(parseDiagram(source));
  if(!diagram.nodes.length)return;
  direction=diagram.direction; nodes=diagram.nodes; edges=diagram.edges; subgraphs=diagram.subgraphs; selected=null; render(false);
}

function toMermaid(){
  const lines=nodes.map(n=>{
    const body=n.shape==='diamond'?`{{${n.label}}}`:n.shape==='pill'?`([${n.label}])`:n.shape==='square'?`[${n.label}]`:n.shape==='circle'?`((${n.label}))`:`(${n.label})`;
    return `    ${n.id}${body}`;
  });
  const groups=subgraphs.map(group=>`    subgraph ${group.label}\n${group.members.map(id=>`        ${id}`).join('\n')}\n    end`);
  const links=edges.map(e=>`    ${e.from} -->${e.label?`|${e.label}|`:''} ${e.to}`);
  return `flowchart ${direction}\n${lines.concat(groups,links).join('\n')}`;
}

if(typeof module!=='undefined') module.exports={parseDiagram,layoutDiagram};
