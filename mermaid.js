function toMermaid(){
  const lines = nodes.map(n=>{
    const body = n.shape==='diamond' ? `{{${n.label}}}` : n.shape==='pill' ? `([${n.label}])` : n.shape==='square' ? `[${n.label}]` : `(${n.label})`;
    return `    ${n.id}${body}`;
  });
  return `flowchart LR\n${lines.join('\n')}\n${edges.map(([a,b])=>`    ${a} --> ${b}`).join('\n')}`;
}

function parseMermaid(value){
  const found = [];
  const pattern = /^\s*([A-Z]\w*)\s*(?:\(\[\s*(.*?)\s*\]\)|\(\((.*?)\)\)|\(\s*(.*?)\s*\)|\[\s*(.*?)\s*\]|\{\{\s*(.*?)\s*\}\})/gm;
  [...value.matchAll(pattern)].forEach(m=>{
    const label = m[2]||m[3]||m[4]||m[5]||m[6];
    if(label && !found.some(n=>n.id===m[1])) found.push({
      id:m[1], label, x:150+found.length%3*230, y:100+Math.floor(found.length/3)*120,
      shape:m[6]?'diamond':m[2]?'pill':m[5]?'square':'round'
    });
  });
  const links = [...value.matchAll(/^\s*([A-Z]\w*)\s*[-=]+>\s*([A-Z]\w*)/gm)].map(m=>[m[1],m[2]]);
  if(found.length){
    nodes = found;
    edges = links.filter(x=>found.some(n=>n.id===x[0])&&found.some(n=>n.id===x[1]));
    selected = null;
    render(false);
  }
}
