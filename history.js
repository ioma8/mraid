let undoStack=[],redoStack=[],historyLimit=100,historyBurst=false,historyBurstTimer=null;

function captureState(){return{nodes:nodes.map(n=>({...n})),edges:edges.map(e=>({...e})),subgraphs:subgraphs.map(g=>({...g,members:[...g.members],bounds:g.bounds?{...g.bounds}:undefined})),direction};}
function applyState(state){nodes=state.nodes;edges=state.edges;subgraphs=state.subgraphs;direction=state.direction;}
function updateHistoryButtons(){if(undoBtn)undoBtn.disabled=!undoStack.length;if(redoBtn)redoBtn.disabled=!redoStack.length;}
function record(fromBurst){if(!fromBurst)endHistoryBurst();undoStack.push(captureState());if(undoStack.length>historyLimit)undoStack.shift();redoStack=[];updateHistoryButtons();}
function recordIfChanged(apply){const before=captureState();record();apply();if(sameState(before))undoStack.pop();updateHistoryButtons();}
function sameState(s){return JSON.stringify([s.nodes,s.edges,s.subgraphs])===JSON.stringify([nodes,edges,subgraphs]);}
function dropLastIfUnchanged(){if(!undoStack.length)return;if(sameState(undoStack[undoStack.length-1]))undoStack.pop();updateHistoryButtons();}
function undo(){if(!undoStack.length)return;redoStack.push(captureState());applyState(undoStack.pop());syncAfterRestore();}
function redo(){if(!redoStack.length)return;undoStack.push(captureState());applyState(redoStack.pop());syncAfterRestore();}
function syncAfterRestore(){endHistoryBurst();cancelActiveDrag();clearSelection();hideMenus();render();updateHistoryButtons();}
function historyCodeEdit(apply){if(!historyBurst){historyBurst=true;record(true);}clearTimeout(historyBurstTimer);historyBurstTimer=setTimeout(()=>{historyBurst=false;},700);apply();}
function endHistoryBurst(){historyBurst=false;clearTimeout(historyBurstTimer);}
