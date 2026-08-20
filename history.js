let undoStack=[],redoStack=[],historyBurst=false,historyBurstTimer=null;

function applyState(state){nodes=state.nodes;edges=state.edges;subgraphs=state.subgraphs;direction=state.direction;}
function updateHistoryButtons(){if(undoBtn)undoBtn.disabled=!undoStack.length;if(redoBtn)redoBtn.disabled=!redoStack.length;}
function record(fromBurst){if(!fromBurst)endHistoryBurst();undoStack.push(snapshotDiagram());if(undoStack.length>100)undoStack.shift();redoStack=[];updateHistoryButtons();}
function recordIfChanged(apply){const before=snapshotDiagram();record();apply();if(sameState(before))undoStack.pop();updateHistoryButtons();}
function sameState(s){return JSON.stringify([s.nodes,s.edges,s.subgraphs,s.direction])===JSON.stringify([nodes,edges,subgraphs,direction]);}
function dropLastIfUnchanged(){if(!undoStack.length)return;if(sameState(undoStack[undoStack.length-1]))undoStack.pop();updateHistoryButtons();}
function undo(){if(!undoStack.length)return;redoStack.push(snapshotDiagram());applyState(undoStack.pop());syncAfterRestore();}
function redo(){if(!redoStack.length)return;undoStack.push(snapshotDiagram());applyState(redoStack.pop());syncAfterRestore();}
function syncAfterRestore(){endHistoryBurst();cancelActiveDrag();clearSelection();hideMenus();render();updateHistoryButtons();}
function historyCodeEdit(apply){if(!historyBurst){historyBurst=true;record(true);}clearTimeout(historyBurstTimer);historyBurstTimer=setTimeout(()=>{historyBurst=false;dropLastIfUnchanged();},700);apply();} // an invalid-only burst changes nothing, so its entry is dropped when the burst ends
function endHistoryBurst(){historyBurst=false;clearTimeout(historyBurstTimer);}
