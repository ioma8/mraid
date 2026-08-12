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
  const ranks=new Map(diagram.nodes.map(n=>[n.id,0])), incoming=new Map(diagram.nodes.map(n=>[n.id,0])), outgoing=new Map();
  diagram.edges.forEach(e=>{incoming.set(e.to,(incoming.get(e.to)||0)+1);if(!outgoing.has(e.from))outgoing.set(e.from,[]);outgoing.get(e.from).push(e.to);});
  const visit=(id,level,path=new Set())=>{ranks.set(id,Math.max(ranks.get(id)||0,level));if(path.has(id))return;const next=new Set(path);next.add(id);(outgoing.get(id)||[]).forEach(to=>visit(to,level+1,next));};
  diagram.nodes.filter(n=>!incoming.get(n.id)).forEach(n=>visit(n.id,0));
  diagram.nodes.forEach(n=>{if(!incoming.get(n.id))return;if(!ranks.get(n.id))visit(n.id,0);});
  const columns=new Map(); diagram.nodes.forEach(n=>{const rank=ranks.get(n.id)||0;if(!columns.has(rank))columns.set(rank,[]);columns.get(rank).push(n);});
  const vertical=diagram.direction==='TB'||diagram.direction==='TD'||diagram.direction==='BT';
  [...columns.entries()].forEach(([rank,items])=>items.forEach((node,index)=>{
    const major=90+rank*220, minor=90+index*170;
    node.x=vertical?minor:major; node.y=vertical?major:minor;
  }));
  if(diagram.direction==='BT') diagram.nodes.forEach(n=>n.y=-n.y);
  if(diagram.direction==='RL') diagram.nodes.forEach(n=>n.x=-n.x);
  return diagram;
}

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
