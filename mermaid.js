function unquote(value){value=value.trim();return value.length>1&&((value[0]==='"'&&value.at(-1)==='"')||(value[0]==="'"&&value.at(-1)==="'"))?value.slice(1,-1):value;}
function shapeFromToken(token){if(token.startsWith('(['))return['pill',unquote(token.slice(2,-2))];if(token.startsWith('{{'))return['diamond',unquote(token.slice(2,-2))];if(token.startsWith('(('))return['circle',unquote(token.slice(2,-2))];if(token.startsWith('['))return['square',unquote(token.slice(1,-1))];return['round',unquote(token.slice(1,-1))];}
function parseDiagram(source){
  if(typeof source!=='string')throw new Error('Diagram source must be text');
  const lines=source.split(/\r?\n/),first=lines.find(line=>line.trim()),header=first?.trim().match(/^(?:flowchart|graph)\s+(TB|TD|BT|RL|LR)$/i);
  if(first&&!header)throw new Error(`Unsupported Mermaid syntax: ${first.trim()}`);
  const diagram={direction:(header?.[1]||'LR').toUpperCase(),nodes:[],edges:[],subgraphs:[]},byId=new Map(),stack=[],edgeKeys=new Set(),ensure=(id,label=id,shape='round')=>{let node=byId.get(id);if(!node){node={id,label,shape,x:0,y:0};byId.set(id,node);diagram.nodes.push(node);}if(stack.length){const group=stack[0];if(stack.some(g=>g!==group))throw new Error('Nested subgraphs are not supported');if(!group.members.includes(id)){if(diagram.subgraphs.some(g=>g!==group&&g.members.includes(id)))throw new Error(`Node belongs to multiple subgraphs: ${id}`);group.members.push(id);}}return node;};
  lines.forEach((raw,index)=>{const line=raw.trim();if(!line||line===first?.trim())return;if(line==='end'){if(!stack.length)throw new Error(`Unexpected end on line ${index+1}`);stack.pop();return;}const group=line.match(/^subgraph\s+(.+)$/i);if(group){if(stack.length)throw new Error(`Nested subgraphs are not supported on line ${index+1}`);diagram.subgraphs.push({label:unquote(group[1]),members:[]});stack.push(diagram.subgraphs.at(-1));return;}
    const token='(?:\\(\\[.*?\\]\\)|\\{\\{.*?\\}\\}|\\(\\(.*?\\)\\)|\\[.*?\\]|\\(.*?\\))',edge=line.match(new RegExp(`^([A-Za-z_]\\w*)\\s*(${token})?\\s*[-.=]+>\\s*(?:\\|([^|]*)\\|\\s*)?([A-Za-z_]\\w*)\\s*(${token})?$`));
    if(edge){if(edge[1]===edge[4])throw new Error(`Self-edges are not supported on line ${index+1}`);const key=`${edge[1]}\0${edge[4]}`;if(edgeKeys.has(key))throw new Error(`Duplicate edge on line ${index+1}`);edgeKeys.add(key);const from=ensure(edge[1],edge[1],'round'),to=ensure(edge[4],edge[4],'round');if(edge[2])[from.shape,from.label]=shapeFromToken(edge[2]);if(edge[5])[to.shape,to.label]=shapeFromToken(edge[5]);diagram.edges.push({from:edge[1],to:edge[4],label:edge[3]||''});return;}
    const definition=line.match(/^([A-Za-z_]\w*)\s*(\(\[.*\]\)|\{\{.*\}\}|\(\(.*\)\)|\[.*\]|\(.*\))$/);if(definition){const[shape,label]=shapeFromToken(definition[2]),node=ensure(definition[1],label,shape);node.label=label;node.shape=shape;return;}const bare=line.match(/^([A-Za-z_]\w*)$/);if(bare){ensure(bare[1]);return;}throw new Error(`Unsupported Mermaid syntax on line ${index+1}: ${line}`);
  });if(stack.length)throw new Error('Unclosed subgraph');return diagram;
}
function layoutDiagram(diagram,center){center=center||{x:650,y:450};
  const rankdir=diagram.direction==='TD'||diagram.direction==='TB'?'TB':diagram.direction,graph=new dagre.graphlib.Graph({compound:true}).setGraph({rankdir,nodesep:60,ranksep:80,marginx:40,marginy:40}).setDefaultEdgeLabel(()=>({}));
  const size=node=>{node.width=node.width||Math.min(300,Math.max(132,node.label.length*7+36));node.height=node.height||(node.shape==='diamond'||node.shape==='circle'?node.width:Math.max(48,Math.ceil((node.label.length*7+36)/300)*18+24));return node;};
  diagram.nodes.forEach(node=>graph.setNode(node.id,size(node)));
  diagram.subgraphs.forEach((group,index)=>{if(!group.members.length){if(!group.bounds)group.bounds={x:center.x-160,y:center.y-90,width:320,height:180};return;}const id=`\u00A7subgraph_${index}`;group.id=id;graph.setNode(id,{label:group.label});group.members.forEach(member=>graph.setParent(member,id));});
  diagram.edges.forEach(edge=>graph.setEdge(edge.from,edge.to,{label:edge.label,width:edge.label?edge.label.length*7+12:0,height:edge.label?18:0}));
  dagre.layout(graph);
  diagram.nodes.forEach(node=>{const placed=graph.node(node.id);node.x=placed.x-node.width/2;node.y=placed.y-node.height/2;});
  diagram.subgraphs.forEach(group=>{if(!group.members.length)return;const placed=graph.node(group.id);group.bounds={x:placed.x-placed.width/2,y:placed.y-placed.height/2,width:placed.width,height:placed.height};});
  if(diagram.nodes.length||diagram.subgraphs.length){
    const minX=Math.min(...diagram.nodes.map(n=>n.x),...diagram.subgraphs.map(g=>g.bounds.x)),maxX=Math.max(...diagram.nodes.map(n=>n.x+n.width),...diagram.subgraphs.map(g=>g.bounds.x+g.bounds.width)),minY=Math.min(...diagram.nodes.map(n=>n.y),...diagram.subgraphs.map(g=>g.bounds.y)),maxY=Math.max(...diagram.nodes.map(n=>n.y+n.height),...diagram.subgraphs.map(g=>g.bounds.y+g.bounds.height));
    const dx=center.x-(minX+maxX)/2,dy=center.y-(minY+maxY)/2;
    diagram.nodes.forEach(n=>{n.x+=dx;n.y+=dy;});
    diagram.subgraphs.forEach(g=>{g.bounds.x+=dx;g.bounds.y+=dy;});
  }
  return diagram;
}
function applyMermaid(source){try{const diagram=layoutDiagram(parseDiagram(source),currentViewCenter());direction=diagram.direction;nodes=diagram.nodes;edges=diagram.edges;subgraphs=diagram.subgraphs;clearSelection();if(typeof codeEditor!=='undefined'){codeEditor.classList.remove('invalid');codeEditor.title='';}render(false);return true;}catch(error){if(typeof codeEditor!=='undefined'){codeEditor.classList.add('invalid');codeEditor.title=error.message;}return false;}}
function tokenFor(shape,label){const wrap=s=>shape==='diamond'?`{{${s}}}`:shape==='pill'?`([${s}])`:shape==='square'?`[${s}]`:shape==='circle'?`((${s}))`:`(${s})`;const roundTrips=token=>{const[parsedShape,parsedLabel]=shapeFromToken(token);return parsedShape===shape&&parsedLabel===label;};const naive=wrap(label);if(roundTrips(naive))return naive;const q=label.includes('"')?"'":'"';return wrap(q+label+q);}
function subgraphLine(label){const q=label.includes('"')?"'":'"';return unquote(label)===label?`subgraph ${label}`:`subgraph ${q}${label}${q}`;}
function toMermaid(){const lines=nodes.map(n=>`    ${n.id}${tokenFor(n.shape,n.label)}`),groups=subgraphs.map(group=>`    ${subgraphLine(group.label)}\n${group.members.map(id=>`        ${id}`).join('\n')}\n    end`),links=edges.map(e=>`    ${e.from} -->${e.label?`|${e.label}|`:''} ${e.to}`);return`flowchart ${direction}\n${lines.concat(groups,links).join('\n')}`;}
if(typeof module!=='undefined')module.exports={parseDiagram,layoutDiagram,toMermaid};
