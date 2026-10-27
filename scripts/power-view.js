// Read-only: derive electricity connections from the engine, never geometric guesses.
exports.read = function(team){
    var Seq=Packages.arc.struct.Seq, nodes={},grids={},edges=[],seen={};
    var dt=Math.max(Number(Packages.arc.util.Time.delta),.001);
    team.data().buildings.each(function(b){
        if(b.power==null||b.power.graph==null)return;
        var key=b.tile.x+','+b.tile.y,g=b.power.graph,gid=String(g.getID());
        var battery=b.block.consPower!=null&&b.block.consPower.buffered;
        nodes[key]={key:key,cell:[Number(b.tile.x),Number(b.tile.y)],center:[Number(b.x/8),Number(b.y/8)],size:Number(b.block.size),block:String(b.block.name),grid:gid,enabled:Boolean(b.enabled),satisfaction:Number(b.power.status),role:battery?'battery':b.block.outputsPower?'generator':b.block.consumesPower?'consumer':'node'};
        if(!grids[gid])grids[gid]={id:gid,nodes:[],produced:Number(g.getLastPowerProduced())/dt*60,needed:Number(g.getLastPowerNeeded())/dt*60,stored:Number(g.getLastPowerStored()),capacity:Number(g.getLastCapacity())};
        grids[gid].nodes.push(key);
    });
    team.data().buildings.each(function(b){
        var key=b.tile.x+','+b.tile.y;if(!nodes[key])return;
        var connections=b.getPowerConnections(new Seq());
        connections.each(function(other){
            if(other==null||other.team!=team)return;
            var k=other.tile.x+','+other.tile.y;if(!nodes[k]||nodes[k].grid!==nodes[key].grid)return;
            var pair=key<k?key+'|'+k:k+'|'+key;if(seen[pair])return;seen[pair]=true;
            var explicit=b.power.links.contains(other.pos())||other.power.links.contains(b.pos());
            edges.push({from:key,to:k,grid:nodes[key].grid,kind:explicit?'node-link':'adjacent'});
        });
    });
    return {nodes:nodes,grids:grids,edges:edges};
};
exports.selectLines = function(lines,hover,modes){
    var wanted={},out=[];for(var i=0;i<hover.length;i++)wanted[hover[i]]=true;
    for(var j=0;j<lines.length;j++){var medium=lines[j].medium==='liquid'?'liquid':'item',mode=modes[medium];if(mode==='ALL'||mode==='On Mouse'&&wanted[j])out.push(j);}
    return out;
};
exports.selectGrids = function(network,key,mode){
    if(mode==='None')return [];
    if(mode==='ALL')return Object.keys(network.grids);
    return network.nodes[key]?[network.nodes[key].grid]:[];
};
