// Read-only power collection, split across updates for large connected grids.
exports.begin=function(team,scope){
 var Seq=Packages.arc.struct.Seq,nodes={},grids={},edges=[],seen={},list=[],at=0,phase=0;
 (scope||team.data().buildings).each(function(b){list.push(b);});
 function node(b){if(b==null||b.tile==null||b.tile.build!=b||b.team!=team||b.power==null||b.power.graph==null)return;
  var key=b.tile.x+','+b.tile.y,g=b.power.graph,gid=String(g.getID()),battery=b.block.consPower!=null&&b.block.consPower.buffered,dt=Math.max(Number(Packages.arc.util.Time.delta),.001);
  nodes[key]={key:key,cell:[Number(b.tile.x),Number(b.tile.y)],center:[Number(b.x/8),Number(b.y/8)],size:Number(b.block.size),block:String(b.block.name),grid:gid,enabled:Boolean(b.enabled),satisfaction:Number(b.power.status),role:battery?'battery':b.block.outputsPower?'generator':b.block.consumesPower?'consumer':'node'};
  if(!grids[gid])grids[gid]={id:gid,total_nodes:Number(g.all.size),nodes:[],produced:Number(g.getLastScaledPowerIn())*60,needed:Number(g.getLastScaledPowerOut())*60,stored:Number(g.getLastPowerStored()),capacity:Number(g.getLastCapacity())};grids[gid].nodes.push(key);
 }
 function connections(b){if(b==null||b.tile==null||b.tile.build!=b||b.power==null)return;var key=b.tile.x+','+b.tile.y;if(!nodes[key])return;
  b.getPowerConnections(new Seq()).each(function(other){if(other==null||other.team!=team||other.power==null)return;var k=other.tile.x+','+other.tile.y;if(!nodes[k]||nodes[k].grid!==nodes[key].grid)return;var pair=key<k?key+'|'+k:k+'|'+key;if(seen[pair])return;seen[pair]=true;var explicit=b.power.links.contains(other.pos())||other.power.links.contains(b.pos());edges.push({from:key,to:k,grid:nodes[key].grid,kind:explicit?'node-link':'adjacent'});});
 }
 return {step:function(limit,deadline,clock){var n=0;while(phase<2&&n++<limit&&clock()<deadline){if(at>=list.length){phase++;at=0;continue;}var b=list[at++];if(phase===0)node(b);else connections(b);}return phase>=2;},result:function(){return {nodes:nodes,grids:grids,edges:edges};},size:list.length};
};
exports.read=function(team,scope){var job=exports.begin(team,scope);while(!job.step(1000000,Infinity,function(){return 0;})){}return job.result();};
exports.selectLines = function(lines,hover,modes){
    var wanted={},out=[];for(var i=0;i<hover.length;i++)wanted[hover[i]]=true;
    if(modes.item!=='ALL'&&modes.liquid!=='ALL')return Object.keys(wanted).map(Number).filter(function(i){return lines[i]&&lines[i].render_scope!=='all'&&modes[lines[i].medium==='liquid'?'liquid':'item']==='On Mouse';}).sort(function(a,b){return a-b;});
    for(var j=0;j<lines.length;j++){var medium=lines[j].medium==='liquid'?'liquid':'item',mode=modes[medium];if(mode==='ALL'&&lines[j].render_scope!=='focus'||mode==='On Mouse'&&wanted[j]&&lines[j].render_scope!=='all')out.push(j);}
    return out;
};
exports.selectGrids = function(network,key,mode){
    if(mode==='None')return [];
    if(mode==='ALL')return Object.keys(network.grids);
    return network.nodes[key]?[network.nodes[key].grid]:[];
};
