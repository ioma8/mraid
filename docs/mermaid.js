function unquote(value){value=value.trim();return value.length>1&&((value[0]==='"'&&value.at(-1)==='"')||(value[0]==="'"&&value.at(-1)==="'"))?value.slice(1,-1):value;}
function shapeFromToken(token){if(token.startsWith('(['))return['pill',unquote(token.slice(2,-2))];if(token.startsWith('{{'))return['diamond',unquote(token.slice(2,-2))];if(token.startsWith('(('))return['circle',unquote(token.slice(2,-2))];if(token.startsWith('['))return['square',unquote(token.slice(1,-1))];return['round',unquote(token.slice(1,-1))];}
function parseDiagram(source){
  const diagram={direction:(source.match(/^(?:flowchart|graph)\s+(TB|TD|BT|RL|LR)/im)||[])[1]||'LR',nodes:[],edges:[],subgraphs:[]},byId=new Map(),stack=[];
  const token='(?:\\(\\[.*?\\]\\)|\\{\\{.*?\\}\\}|\\(\\(.*?\\)\\)|\\[.*?\\]|\\(.*?\\))',ensure=(id,label=id,shape='round')=>{let node=byId.get(id);if(!node){node={id,label,shape,x:0,y:0};byId.set(id,node);diagram.nodes.push(node);}if(stack.length&&!stack.at(-1).members.includes(id))stack.at(-1).members.push(id);return node;};
  source.split(/\r?\n/).forEach(raw=>{const line=raw.trim();if(!line||/^(?:flowchart|graph)\s/i.test(line)){return;}if(line==='end'){stack.pop();return;}const group=line.match(/^subgraph\s+(.*)$/i);if(group){const sub={label:unquote(group[1]),members:[]};diagram.subgraphs.push(sub);stack.push(sub);return;}
    const edge=line.match(new RegExp(`^([A-Za-z_]\\w*)\\s*(${token})?\\s*[-.=]+>\\s*(?:\\|([^|]*)\\|\\s*)?([A-Za-z_]\\w*)\\s*(${token})?`));
    if(edge){const from=ensure(edge[1],edge[1],'round'),to=ensure(edge[4],edge[4],'round');if(edge[2])[from.shape,from.label]=shapeFromToken(edge[2]);if(edge[5])[to.shape,to.label]=shapeFromToken(edge[5]);diagram.edges.push({from:edge[1],to:edge[4],label:edge[3]||''});return;}
    const definition=line.match(/^([A-Za-z_]\w*)\s*(\(\[.*\]\)|\{\{.*\}\}|\(\(.*\)\)|\[.*\]|\(.*\))$/);if(definition){const[shape,label]=shapeFromToken(definition[2]),node=ensure(definition[1],label,shape);node.label=label;node.shape=shape;}else{const bare=line.match(/^([A-Za-z_]\w*)$/);if(bare)ensure(bare[1],bare[1],'round');}
  });return diagram;
}
function layoutDiagram(diagram){
  const rankdir=diagram.direction==='TD'||diagram.direction==='TB'?'TB':diagram.direction,graph=new dagre.graphlib.Graph({compound:true}).setGraph({rankdir,nodesep:60,ranksep:80,marginx:40,marginy:40}).setDefaultEdgeLabel(()=>({}));
  const size=node=>{node.width=node.width||Math.min(300,Math.max(132,node.label.length*7+36));node.height=node.height||(node.shape==='diamond'||node.shape==='circle'?node.width:Math.max(48,Math.ceil((node.label.length*7+36)/300)*18+24));return node;};
  diagram.nodes.forEach(node=>graph.setNode(node.id,size(node)));
  diagram.subgraphs.forEach((group,index)=>{const id=`\u00A7subgraph_${index}`;group.id=id;graph.setNode(id,{label:group.label});group.members.forEach(member=>graph.setParent(member,id));});
  diagram.edges.forEach(edge=>graph.setEdge(edge.from,edge.to,{label:edge.label,width:edge.label?edge.label.length*7+12:0,height:edge.label?18:0}));
  dagre.layout(graph);
  diagram.nodes.forEach(node=>{const placed=graph.node(node.id);node.x=placed.x-node.width/2;node.y=placed.y-node.height/2;});
  diagram.subgraphs.forEach(group=>{const placed=graph.node(group.id);group.bounds={x:placed.x-placed.width/2,y:placed.y-placed.height/2,width:placed.width,height:placed.height};});
  return diagram;
}
function applyMermaid(source){const diagram=layoutDiagram(parseDiagram(source));if(!diagram.nodes.length)return;direction=diagram.direction;nodes=diagram.nodes;edges=diagram.edges;subgraphs=diagram.subgraphs;selected=null;selectedEdge=null;render(false);}
function toMermaid(){const lines=nodes.map(n=>{const body=n.shape==='diamond'?`{{${n.label}}}`:n.shape==='pill'?`([${n.label}])`:n.shape==='square'?`[${n.label}]`:n.shape==='circle'?`((${n.label}))`:`(${n.label})`;return`    ${n.id}${body}`;}),groups=subgraphs.map(group=>`    subgraph ${group.label}\n${group.members.map(id=>`        ${id}`).join('\n')}\n    end`),links=edges.map(e=>`    ${e.from} -->${e.label?`|${e.label}|`:''} ${e.to}`);return`flowchart ${direction}\n${lines.concat(groups,links).join('\n')}`;}
if(typeof module!=='undefined')module.exports={parseDiagram,layoutDiagram};
