/* Compose viewport drawing segments without rebuilding a whole-world graph. */
function key(p){return p.join(',');}
function bounds(ps){var b=[Infinity,Infinity,-Infinity,-Infinity];ps.forEach(function(p){b[0]=Math.min(b[0],p[0]*8);b[1]=Math.min(b[1],p[1]*8);b[2]=Math.max(b[2],p[0]*8);b[3]=Math.max(b[3],p[1]*8);});return b;}
exports.chunk=function(model,primary){var lines=[],seen={},markers={},rules={},issues={};
 model.lines.forEach(function(l){for(var i=1;i<l.points.length;i++){var a=l.points[i-1],b=l.points[i],ak=Math.floor(a[0])+','+Math.floor(a[1]),bk=Math.floor(b[0])+','+Math.floor(b[1]);if((!primary[ak]&&!primary[bk])||key(a)===key(b))continue;var id=l.medium+':'+key(a)+'>'+key(b);if(seen[id])continue;seen[id]=true;lines.push({id:id,medium:l.medium,points:[a,b],cells:[ak.split(',').map(Number),bk.split(',').map(Number)],issues:l.issues,ends:[],cycle:l.cycle,badges:[],render_scope:'all',bounds:bounds([a,b]),bad:l.issues.some(function(c){return /OPEN_|INVALID_|BLOCKED_|CYCLE/.test(c);})});}});
 Object.keys(primary).forEach(function(k){if(model.markers[k])markers[k]=model.markers[k];if(model.rules[k])rules[k]=model.rules[k];if(model.issues[k])issues[k]=model.issues[k];});return {lines:lines,markers:markers,rules:rules,issues:issues};
};
exports.empty=function(){return {lines:[],seen:{},index:{},markers:{},rules:{},issues:{}};};
exports.append=function(base,c){['markers','rules','issues'].forEach(function(f){Object.keys(c[f]).forEach(function(k){base[f][k]=c[f][k];});});c.lines.forEach(function(l){if(base.seen[l.id])return;base.seen[l.id]=true;var i=base.lines.length;base.lines.push(l);l.cells.forEach(function(p){(base.index[key(p)]||(base.index[key(p)]=[])).push(i);});});};
exports.compose=function(chunks,focus,revision){var base;if(Array.isArray(chunks)){base=exports.empty();chunks.forEach(function(c){exports.append(base,c);});}else base=chunks;
 var lines=base.lines.slice(),index=Object.create(base.index),markers=Object.create(base.markers),rules=Object.create(base.rules),issues=Object.create(base.issues),selection={},ends={},offset=lines.length;
 if(focus){focus.lines.forEach(function(l){l.render_scope='focus';lines.push(l);});Object.keys(focus.index).forEach(function(k){index[k]=focus.index[k].map(function(i){return i+offset;});});['markers','rules','issues'].forEach(function(f){var dst=f==='markers'?markers:f==='rules'?rules:issues;Object.keys(focus[f]).forEach(function(k){dst[k]=focus[f][k];});});}
 function select(k){if(!selection[k]){selection[k]=focus?focus.select(k).map(function(i){return i+offset;}):[];ends[k]=focus?focus.ends[k]||[]:[];}return selection[k];}
 return {version:'standalone/1.1.2',revision:revision,lines:lines,index:index,markers:markers,rules:rules,issues:issues,selection:selection,ends:ends,select:select,badgeSelection:select,badges:function(k,i){return focus&&i>=offset?focus.badges(k,i-offset):[];}};
};
