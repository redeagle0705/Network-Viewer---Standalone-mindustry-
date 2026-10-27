/* Structural connection graph, v160.7. Possibilities, never measured throughput.
 * ES5 module shared by Rhino and Node differential tests; no I/O or commands. */
var SIZE=require('block-sizes');
var D=[[1,0],[0,1],[-1,0],[0,-1]];
function set(s){var o={};s.split(' ').forEach(function(k){o[k]=true;});return o;}
function own(o,k){return Object.prototype.hasOwnProperty.call(o,k);}
function pos(b){return b.x+','+b.y;}
function integer(n){return typeof n==='number'&&isFinite(n)&&Math.floor(n)===n;}
function rot(b){return integer(b.r)&&b.r>=0&&b.r<4?b.r:null;}
function size(b){return b.size===undefined?(SIZE[b.b]||1):b.size;}
function cells(b){var n=size(b),o=-Math.floor((n-1)/2),out=[];for(var x=o;x<o+n;x++)for(var y=o;y<o+n;y++)out.push([b.x+x,b.y+y]);return out;}
function dir(a,b){return b.x>a.x?0:b.x<a.x?2:b.y>a.y?1:3;}
function same(a,b){return a&&b&&pos(a)===pos(b);}
function equal(a,b){return JSON.stringify(a)===JSON.stringify(b);}
var BELTS=set('conveyor titanium-conveyor armored-conveyor'),FACT=set('graphite-press silicon-smelter kiln plastanium-compressor surge-smelter pulverizer spore-press ground-factory air-factory naval-factory'),NOOUT=set('spore-press ground-factory air-factory naval-factory'),STORAGE=set('container vault reinforced-container reinforced-vault'),DRILLS=set('mechanical-drill pneumatic-drill laser-drill blast-drill impact-drill eruption-drill plasma-bore large-plasma-bore'),BRIDGES=set('bridge-conveyor phase-conveyor'),QUIET=set('power-node power-node-large battery battery-large surge-tower');
var FILTERS=set('sorter inverted-sorter'),GATES=set('overflow-gate underflow-gate'),DUCTS=set('duct armored-duct'),DISTS=set('duct-router surge-router overflow-duct underflow-duct'),STACKS=set('plastanium-conveyor surge-conveyor'),UNLOAD=set('unloader duct-unloader'),EXTRA=set('sorter inverted-sorter overflow-gate underflow-gate duct armored-duct duct-router surge-router overflow-duct underflow-duct plastanium-conveyor surge-conveyor unloader duct-unloader duct-bridge mass-driver item-source item-void incinerator electric-incinerator'),SINKS=set('item-void incinerator electric-incinerator');
var PIPES=set('conduit pulse-conduit plated-conduit reinforced-conduit'),ARMOR=set('plated-conduit reinforced-conduit'),LJ=set('liquid-junction reinforced-liquid-junction'),LR=set('liquid-router liquid-container liquid-tank reinforced-liquid-router reinforced-liquid-container reinforced-liquid-tank'),LB=set('bridge-conduit phase-conduit'),LD=set('reinforced-bridge-conduit');
function graph(doc,liquid){
 if(!integer(doc.width)||!integer(doc.height)||doc.width<1||doc.height<1)throw Error('invalid map dimensions');
 var bs={},occ={},nodes={},edgeMap={},conditions={},deps={},notes=[],resource=doc.selected_resource,complete=doc.buildings_complete===true;
 function pid(b,p){return (liquid?'liquid:':'')+pos(b)+':'+p;}
 function note(code,b,extra){var n={code:code};if(b)n.cell=[b.x,b.y];if(extra)Object.keys(extra).forEach(function(k){n[k]=extra[k];});notes.push(n);}
 if(!liquid){if(!doc.map)note('WORLD_ID_UNKNOWN');if(!complete)note('BUILDING_COVERAGE_UNKNOWN');}
 var raw=(doc.buildings||[]).slice();if(!liquid)(doc.cores||[]).forEach(function(c){var b={};Object.keys(c).forEach(function(k){if(k!=='block')b[k]=c[k];});b.b=c.block;raw.push(b);});
 raw.forEach(function(b){if(!b||typeof b.b!=='string'||!integer(b.x)||!integer(b.y)||!integer(size(b))||size(b)<1||size(b)>16)throw Error('invalid building');var p=pos(b);if(bs[p]){if(bs[p].b!==b.b)note('OVERLAPPING_BUILDINGS',b);return;}bs[p]=b;cells(b).forEach(function(c){if(!liquid&&(c[0]<0||c[1]<0||c[0]>=doc.width||c[1]>=doc.height))note('OUT_OF_BOUNDS',b);if(!liquid&&occ[c.join(',')])note('OVERLAPPING_BUILDINGS',b);occ[c.join(',')]=b;});});
 var all=Object.keys(bs).map(function(k){return bs[k];});
 function add(b,p,kind){var id=pid(b,p),n=size(b),o=n%2===0?.5:0;nodes[id]={id:id,cell:[b.x,b.y],center:[b.x+o,b.y+o],size:n,block:b.b,port:p,kind:kind};if(liquid)nodes[id].medium='liquid';return id;}
 function edge(a,z,c){if(!nodes[a]||!nodes[z])return;var key=a+'>'+z;edgeMap[key]=[a,z];if(c)conditions[key]=c;}
 function nearby(b,r,k){k=k||1;return occ[(b.x+D[r][0]*k)+','+(b.y+D[r][1]*k)];}
 function isgate(b){return FILTERS[b.b]||GATES[b.b];}
 function handles(b){return EXTRA[b.b]||b.item_role==='producer'||b.item_role==='consumer';}
 function link(b){
  var n=b.b,r=rot(b),q,v=b.link;if(b.link_valid===false)return null;
  if(n==='duct-bridge'||LD[n]){if(r===null)return null;for(var k=1;k<=(b.range_tiles===undefined?4:b.range_tiles);k++){q=nearby(b,r,k);if(q&&q.b===n)return q;}return null;}
  if(!Array.isArray(v)||v.length!==2||!integer(v[0])||!integer(v[1]))return null;q=bs[v.join(',')];if(!q||q.b!==n)return null;
  var dx=v[0]-b.x,dy=v[1]-b.y;
  if(n==='mass-driver')return (dx||dy)&&dx*dx+dy*dy<=Math.pow(b.range_tiles===undefined?55:b.range_tiles,2)?q:null;
  if(BRIDGES[n]||LB[n])return (dx===0||dy===0)&&Math.abs(dx)+Math.abs(dy)>=1&&Math.abs(dx)+Math.abs(dy)<=(b.range_tiles===undefined?(n.indexOf('phase-')===0?12:4):b.range_tiles)&&!equal(q.link,[b.x,b.y])?q:null;
  return null;
 }
 var linked={},incoming={};all.forEach(function(b){var q=link(b);if(q){linked[pos(b)]=q;(incoming[pos(q)]||(incoming[pos(q)]=[])).push(b);}});
 function target(b){return linked[pos(b)]||null;}
 function matches(b,equalMatch){return resource==null||!own(b,'filter')||((resource===b.filter)===equalMatch);}
 all.forEach(function(b){var n=b.b,r=rot(b),p;
  if(liquid){
   if(LJ[n])for(p=0;p<4;p++)add(b,String(p),'transport');
   else if(PIPES[n]||LR[n]||LB[n]||LD[n])add(b,'flow',PIPES[n]?'transport':'branch');
   else if(b.liquid_role){if(b.liquid_inputs&&b.liquid_inputs.length)add(b,'in','consumer');if((b.liquid_outputs&&b.liquid_outputs.length)||b.liquid_role==='source')add(b,'out',b.liquid_role==='source'?'source':'producer');}
   if(PIPES[n]||LR[n]||LB[n]||LD[n]||LJ[n]||b.liquid_role)note('LIQUID_PRESSURE_STOCK_CONDITIONAL',b);
   if((PIPES[n]||LD[n])&&r===null)note('ROTATION_UNKNOWN',b);return;
  }
  if(handles(b)){
   if(isgate(b)){for(p=0;p<4;p++){add(b,'in'+p,'conditional');add(b,'out'+p,'conditional');}note(FILTERS[n]?'FILTER_CONDITIONAL':'SATURATION_PRIORITY_CONDITIONAL',b);if(FILTERS[n]&&!own(b,'filter'))note('FILTER_UNKNOWN',b);}
   else if(EXTRA[n]){add(b,n==='item-source'?'out':SINKS[n]?'in':'flow',n==='item-source'?'source':SINKS[n]?'sink':DUCTS[n]?'transport':'conditional');if(!DUCTS[n]&&n!=='item-void')note('CONDITIONAL_TRANSFER',b);if(STACKS[n]&&[0,1,2].indexOf(b.stack_state)<0)note('STACK_STATE_UNKNOWN',b);if(UNLOAD[n]&&!own(b,'filter'))note('FILTER_UNKNOWN',b);}
   else{add(b,'in','consumer');if(b.item_role==='producer'){add(b,'out','producer');deps[pid(b,'in')+'>'+pid(b,'out')]=[pid(b,'in'),pid(b,'out')];}note('RECIPE_STATE_CONDITIONAL',b);}
   if((DUCTS[n]||DISTS[n]||STACKS[n]||n==='duct-bridge'||n==='duct-unloader')&&r===null)note('ROTATION_UNKNOWN',b);
  }else if(BELTS[n]){add(b,'flow','transport');if(r===null)note('ROTATION_UNKNOWN',b);}
  else if(n==='junction')for(p=0;p<4;p++)add(b,String(p),'transport');
  else if(BRIDGES[n])add(b,'flow','transport');
  else if(n==='router'||n==='distributor'){add(b,'flow','branch');note('CONDITIONAL_DISTRIBUTION',b);}
  else if(n.indexOf('core-')===0)add(b,'in','sink');
  else if(FACT[n]){add(b,'in','consumer');if(!NOOUT[n]){add(b,'out','producer');deps[pid(b,'in')+'>'+pid(b,'out')]=[pid(b,'in'),pid(b,'out')];}note('RECIPE_OR_FILTER_NOT_VERIFIED',b);}
  else if(DRILLS[n]){add(b,'out','source');note('SOURCE_RESOURCE_NOT_VERIFIED',b);}
  else if(STORAGE[n]){add(b,'in','consumer');note('STORAGE_CORE_LINK_NOT_VERIFIED',b);}
  else if(!QUIET[n]&&!/-wall(-large)?$/.test(n)){add(b,'unknown','unknown');note('UNSUPPORTED_BLOCK',b);}
 });
 function accept(q,travel,src){if(!q)return null;var n=q.b,r=rot(q),t=target(q);
  if(liquid){
   if(PIPES[n]){if(r===null||travel===(r+2)%4)return null;if(ARMOR[n]&&travel!==r&&!PIPES[src.b]&&!LD[src.b]&&!LJ[src.b])return null;return pid(q,'flow');}
   if(LJ[n])return q.enabled===false?null:pid(q,String(travel));
   if(LR[n])return pid(q,'flow');
   if(LB[n]){if(q.enabled===false)return null;if(LB[src.b]&&target(src)===q)return pid(q,'flow');return t&&travel!==(dir(q,t)+2)%4?pid(q,'flow'):null;}
   if(LD[n]){if(r===null||travel===(r+2)%4)return null;if(!t&&!(LD[src.b]&&target(src)===q))return null;var others=incoming[pos(q)]||[];for(var k=0;k<others.length;k++)if(LD[others[k].b]&&others[k]!==src&&rot(others[k])===travel)return null;return pid(q,'flow');}
   return nodes[pid(q,'in')]?pid(q,'in'):null;
  }
  if(handles(q)){
   if(isgate(q))return pid(q,'in'+travel);
   if(DUCTS[n]){if(r===null)return null;if(n==='duct'&&travel===(r+2)%4)return null;if(n==='armored-duct'&&travel!==r&&!((own(src,'is_duct')?src.is_duct:DUCTS[src.b]||src.b==='duct-bridge'||src.b==='duct-unloader')&&rot(src)===travel))return null;return pid(q,'flow');}
   if(DISTS[n])return r===travel?pid(q,'flow'):null;
   if(STACKS[n])return q.stack_state===1&&r!==null&&travel!==(r+2)%4?pid(q,'flow'):null;
   if(n==='duct-bridge'){if(r===null||!t||travel===(r+2)%4)return null;var inc=incoming[pos(q)]||[];for(var j=0;j<inc.length;j++)if(inc[j].b===n&&rot(inc[j])===travel)return null;return pid(q,'flow');}
   if(n==='mass-driver')return t?pid(q,'flow'):null;
   if(UNLOAD[n]||n==='item-source')return null;
   if(SINKS[n])return pid(q,'in');
   if(q.item_role){if(Array.isArray(q.input_items)&&(q.input_items.length===0||(resource&&q.input_items.indexOf(resource)<0)))return null;return pid(q,'in');}return null;
  }
  if(BELTS[n]){if(r===null||travel===(r+2)%4)return null;if(n==='armored-conveyor'&&!BELTS[src.b]&&travel!==r)return null;return pid(q,'flow');}
  if(n==='junction')return pid(q,String(travel));
  if(BRIDGES[n])return t&&travel!==(dir(q,t)+2)%4?pid(q,'flow'):null;
  if(n==='router'||n==='distributor')return pid(q,'flow');
  if(FACT[n]||STORAGE[n]||n.indexOf('core-')===0)return pid(q,'in');return null;
 }
 function forward(b,p,r,c,report){cells(b).forEach(function(xy){var xy2=[xy[0]+D[r][0],xy[1]+D[r][1]],q=occ[xy2.join(',')];if(same(q,b))return;var z=accept(q,r,b);if(z)edge(pid(b,p),z,c);else if(report)note(q?'BLOCKED_OR_UNSUPPORTED_RECEIVER':complete?'OPEN_END':'UNCONFIRMED_END',b,{target:xy2,port:p});});}
 function directions(fn){for(var d=0;d<4;d++)fn(d);}
 function unload(b){var n=b.b,r=rot(b);if(n==='duct-unloader'&&r===null)return;if(resource&&b.filter!=null&&b.filter!==resource)return;
  var near={},pairs={};directions(function(d){cells(b).forEach(function(c){var q=occ[(c[0]+D[d][0])+','+(c[1]+D[d][1])];if(q&&!same(q,b))near[pos(q)]=q;});});
  Object.keys(near).forEach(function(k){var src=near[k],core=src.b.indexOf('core-')===0||src.linked_core!=null;if(n==='duct-unloader'&&(src!==nearby(b,(r+2)%4)||core))return;if(src.can_unload!==true){if(!own(src,'can_unload'))note('UNLOAD_CAPABILITY_UNKNOWN',b);return;}var ports=['out','flow','in'].map(function(p){return pid(src,p);}).filter(function(p){return !!nodes[p];});if(!ports.length)return;
   (n==='duct-unloader'?[r]:[0,1,2,3]).forEach(function(out){var t=nearby(b,out);if(!t||t===src)return;if(n==='unloader'&&(STORAGE[t.b]||t.b.indexOf('core-')===0))return;var z=accept(t,out,b);if(z)pairs[ports[0]+'>'+z]=[ports[0],z];});
  });Object.keys(pairs).sort().forEach(function(k,i){var p='transfer'+(doc.stable_unload_ports?k.replace(/[^a-zA-Z0-9_-]/g,'_'):i);add(b,p,'conditional');var c={kind:'unload',item:b.filter==null?null:b.filter,known:own(b,'filter'),requires:'source_stock_and_receiver_capacity_balance'};edge(pairs[k][0],pid(b,p),c);edge(pid(b,p),pairs[k][1],c);});
 }
 all.forEach(function(b){var n=b.b,r=rot(b),t=target(b);
  if(liquid){
   if(PIPES[n]){if(r!==null)forward(b,'flow',r);}
   else if(LJ[n]){if(b.enabled!==false)directions(function(d){forward(b,String(d),d);});}
   else if(LR[n])directions(function(d){forward(b,'flow',d);});
   else if(LB[n]||LD[n]){
    if(t){var z=accept(t,dir(b,t),b);if(z)edge(pid(b,'flow'),z);}
    else if(LD[n]){if(r!==null)forward(b,'flow',r);}
    else if(!own(b,'link'))note('LIQUID_BRIDGE_LINK_UNKNOWN',b);
    else{if(b.link!==null)note('INVALID_LIQUID_BRIDGE_LINK',b);var blocked={};(incoming[pos(b)]||[]).forEach(function(a){if(LB[a.b])blocked[dir(b,a)]=true;});directions(function(d){if(!blocked[d])forward(b,'flow',d);});}
   }else if(nodes[pid(b,'out')]){var outs={};(b.liquid_outputs||[]).forEach(function(o){outs[o.direction===undefined?-1:o.direction]=true;});if(!Object.keys(outs).length)outs[-1]=true;Object.keys(outs).forEach(function(k){var d=Number(k);if(d===-1)directions(function(a){forward(b,'out',a);});else if(r!==null)forward(b,'out',(r+d)%4);});note('LIQUID_RECIPE_OR_PUMP_CONDITIONAL',b);}return;
  }
  if(handles(b)){
   if(isgate(b)){directions(function(travel){var src=nearby(b,(travel+2)%4);[travel,(travel+1)%4,(travel+3)%4].forEach(function(out){var q=nearby(b,out);if(!src||!q||(isgate(src)&&isgate(q)))return;var straight=out===travel,c;if(FILTERS[n]){var eq=(n==='sorter')===(b.enabled!==false);if(!straight)eq=!eq;if(!matches(b,eq))return;c={kind:'filter',item:b.filter==null?null:b.filter,known:own(b,'filter'),match:eq,selection:'receiver_can_accept'};}else{var side=(n==='underflow-gate')===(b.enabled!==false),preferred=straight!==side;c={kind:'priority',priority:preferred?1:2,requires:preferred?'receiver_can_accept':'preferred_outputs_blocked',preferred:side?'sides':'straight'};}var dest=accept(q,out,b);if(dest){edge(pid(b,'in'+travel),pid(b,'out'+out),c);edge(pid(b,'out'+out),dest);}});});}
   else if(DUCTS[n]){if(r!==null)forward(b,'flow',r);}
   else if(DISTS[n]){if(r===null)return;if(b.enabled===false){note('DISABLED_TRANSPORT',b);return;}[r,(r+1)%4,(r+3)%4].forEach(function(out){var c;if(n==='overflow-duct'||n==='underflow-duct'){var preferred=(out===r)===(n==='overflow-duct');c={kind:'priority',priority:preferred?1:2,requires:preferred?'receiver_can_accept':'preferred_outputs_blocked'};}else{if(b.filter!=null&&!matches(b,out===r))return;c={kind:'duct_filter',item:b.filter==null?null:b.filter,known:own(b,'filter'),match:out===r,batch:n==='surge-router'};}forward(b,'flow',out,c);});}
   else if(n==='duct-bridge'){if(r===null)return;if(t)edge(pid(b,'flow'),pid(t,'flow'),{kind:'bridge',requires:'enabled_and_destination_space'});else forward(b,'flow',r);}
   else if(STACKS[n]){if(r===null)return;if(b.stack_state===0||b.stack_state===1){var q=nearby(b,r);if(q&&STACKS[q.b])edge(pid(b,'flow'),pid(q,'flow'),{kind:'stack',requires:'batch_ready_destination_empty_enabled'});}else if(b.stack_state===2)(b.output_router===undefined?n==='plastanium-conveyor':b.output_router)?directions(function(d){forward(b,'flow',d,{kind:'stack_unload'});}):forward(b,'flow',r,{kind:'stack_unload'});}
   else if(n==='mass-driver'){if(t)edge(pid(b,'flow'),pid(t,'flow'),{kind:'mass_driver',requires:'power_batch_alignment_receiver_queue'});else if(b.link!=null)note('INVALID_BRIDGE_LINK',b);directions(function(d){forward(b,'flow',d,{kind:'driver_local_dump',requires:'idle_or_accepting'});});}
   else if(UNLOAD[n])unload(b);
   else if(n==='item-source'){if(!own(b,'filter'))note('FILTER_UNKNOWN',b);if(b.filter==null||(resource&&resource!==b.filter))return;directions(function(d){forward(b,'out',d,{kind:'source',item:b.filter});});}
   else if(b.item_role==='producer'){if(resource&&b.output_items!=null&&b.output_items.indexOf(resource)<0)return;directions(function(d){forward(b,'out',d,{kind:'production',items:b.output_items===undefined?null:b.output_items,requires:'recipe_and_destination_space'});});}
  }else if(BELTS[n]&&r!==null)forward(b,'flow',r,null,true);
  else if(n==='junction')directions(function(d){forward(b,String(d),d);});
  else if(BRIDGES[n]){if(b.link===null||b.link_valid===false){if(b.link!==null)note('INVALID_BRIDGE_LINK',b,{target:b.link});note('BRIDGE_TERMINAL_DUMP_CONDITIONAL',b);var blocked={};(incoming[pos(b)]||[]).forEach(function(a){if(BRIDGES[a.b])blocked[dir(b,a)]=true;});directions(function(d){if(!blocked[d])forward(b,'flow',d);});}else if(Array.isArray(b.link)&&b.link.length===2&&integer(b.link[0])&&integer(b.link[1])){if(t)edge(pid(b,'flow'),pid(t,'flow'));else note('INVALID_BRIDGE_LINK',b,{target:b.link});}else note('BRIDGE_LINK_UNKNOWN',b);}
  else if(DRILLS[n]||(FACT[n]&&!NOOUT[n])||n==='router'||n==='distributor')directions(function(d){forward(b,n==='router'||n==='distributor'?'flow':'out',d);});
 });
 if(!liquid){var gates={},adj={},reached={},todo=[];Object.keys(nodes).forEach(function(i){if(FILTERS[nodes[i].block]||GATES[nodes[i].block])gates[i]=true;});Object.keys(edgeMap).forEach(function(k){var e=edgeMap[k];(adj[e[0]]||(adj[e[0]]=[])).push(e[1]);if(!gates[e[0]]&&gates[e[1]]&&!reached[e[1]]){reached[e[1]]=true;todo.push(e[1]);}});while(todo.length){var u=todo.pop();(adj[u]||[]).forEach(function(z){if(gates[z]&&!reached[z]){reached[z]=true;todo.push(z);}});}Object.keys(edgeMap).forEach(function(k){if(gates[edgeMap[k][0]]&&!reached[edgeMap[k][0]]){delete edgeMap[k];delete conditions[k];}});Object.keys(reached).forEach(function(i){if(nodes[i].port.indexOf('in')===0&&!(adj[i]||[]).length)note('BLOCKED_GATE_ROUTE',bs[nodes[i].cell.join(',')]);});}
 var edges=Object.keys(edgeMap).sort().map(function(k){return edgeMap[k];}),ins={},outs={},lines=[],seen={};edges.forEach(function(e){(outs[e[0]]||(outs[e[0]]=[])).push(e[1]);(ins[e[1]]||(ins[e[1]]=[])).push(e[0]);});
 function line(path,cycle){lines.push({id:(liquid?'liquid-':'item-')+lines.length,ports:path,cells:path.map(function(i){return nodes[i].cell;}),cycle:cycle});}
 if(liquid)edges.forEach(function(e){line(e,false);conditions[e[0]+'>'+e[1]]={kind:'liquid',requires:'pressure_compatible_liquid_capacity_recipe_power'};});
 else{var bounds={};Object.keys(nodes).forEach(function(i){var a=(ins[i]||[]).length,z=(outs[i]||[]).length;nodes[i].junction_role=a>1?'merge':z>1?'branch':null;if(nodes[i].block==='junction'&&a&&!z)note('OPEN_JUNCTION_LANE',bs[nodes[i].cell.join(',')],{port:nodes[i].port});if(nodes[i].kind!=='transport'||a!==1||z!==1)bounds[i]=true;});edges.forEach(function(e){var k=e[0]+'>'+e[1];if(seen[k]||!bounds[e[0]])return;var path=e.slice(),cur=e[1];seen[k]=true;while(!bounds[cur]){var next=outs[cur][0],key=cur+'>'+next;if(seen[key])break;seen[key]=true;path.push(next);cur=next;}line(path,false);});edges.forEach(function(e){if(seen[e[0]+'>'+e[1]])return;var path=[e[0]],cur=e[0];while((outs[cur]||[]).length){var next=outs[cur][0],k=cur+'>'+next;if(seen[k])break;seen[k]=true;path.push(next);cur=next;}var cycle=path[0]===path[path.length-1];line(path,cycle);if(cycle)note('TRANSPORT_CYCLE',null,{cell:nodes[e[0]].cell});});}
 var cs=Object.keys(conditions).sort().map(function(k){var e=edgeMap[k],c={source:e[0],target:e[1]};Object.keys(conditions[k]).forEach(function(n){c[n]=conditions[k][n];});return c;});
 return {ports:nodes,edges:edges,dependencies:Object.keys(deps).sort().map(function(k){return deps[k];}),lines:lines,diagnostics:notes,edge_conditions:cs,flow_validation:'NOT_MEASURED'};
}
exports.analyze=function(doc){return graph(doc,false);};
exports.analyzeLiquids=function(doc){return graph(doc,true);};
exports.cells=cells;
