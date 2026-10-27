/* Incremental port walk. The adapter reads only local adjacency/link context.
 * No team-wide enumeration; factories stop the walk, junction lanes stay separate. */
var T=require('topology');
function key(b){return b.x+','+b.y;}
exports.create=function(meta,root,read,neighbors,media){
 var rows={},locals={},queue=[],head=0,seen=[{},{}],seeds={},done=!root,limited=false,expanded=0;
 function row(k){if(!Object.prototype.hasOwnProperty.call(rows,k)){var b=read(k);rows[k]=b||null;}return rows[k];}
 function local(k){
  if(locals[k])return locals[k];var b=row(k);if(!b)return null;
  var support={},first=[k].concat(neighbors(b));
  first.forEach(function(n){var r=row(n);if(r)support[n]=r;});
  first.forEach(function(n){var r=row(n);if(r)neighbors(r).forEach(function(q){var z=row(q);if(z)support[q]=z;});});
  var d={map:meta.map,width:meta.width,height:meta.height,buildings_complete:true,stable_unload_ports:true,buildings:Object.keys(support).map(function(n){return support[n];})};
  var graphs=[],ports={},adj=[{},{}];if(media.item)graphs.push(T.analyze(d));if(media.liquid)graphs.push(T.analyzeLiquids(d));
  graphs.forEach(function(g){Object.keys(g.ports).forEach(function(p){ports[p]=g.ports[p];});g.edges.forEach(function(e){(adj[0][e[0]]||(adj[0][e[0]]=[])).push(e[1]);(adj[1][e[1]]||(adj[1][e[1]]=[])).push(e[0]);});});
  expanded++;return locals[k]={ports:ports,adj:adj};
 }
 function push(id,p,back){if(seen[back][id])return;seen[back][id]=true;queue.push({id:id,cell:p.cell,kind:p.kind,back:back});}
 if(root){var initial=local(root);if(initial)Object.keys(initial.ports).forEach(function(id){var p=initial.ports[id];if(p.cell.join(',')===root){seeds[id]=true;push(id,p,0);push(id,p,1);}});}
 return {step:function(maxOps,deadline,clock){var n=0;while(head<queue.length&&n++<maxOps&&clock()<deadline){var q=queue[head++];if(!seeds[q.id]&&q.kind!=='transport'&&q.kind!=='branch'&&q.kind!=='conditional')continue;
   if(expanded>=12000){limited=true;head=queue.length;break;}var g=local(q.cell.join(','));if(!g)continue;(g.adj[q.back][q.id]||[]).forEach(function(z){push(z,g.ports[z],q.back);});
  }done=head>=queue.length;return done;},rows:function(){return Object.keys(rows).filter(function(k){return rows[k]!=null;}).map(function(k){return rows[k];});},stats:function(){return {done:done,limited:limited,expanded:expanded,read_rows:Object.keys(rows).length,ports:head,pending:queue.length-head};}};
};
