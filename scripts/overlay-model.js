/* Renderer model with lazy, bounded hover walks. Facilities terminate walks. */
var T=require('topology');
function own(o,k){return Object.prototype.hasOwnProperty.call(o,k);}
function key(p){return p.join(',');}
function unique(a){var o={};a.forEach(function(x){o[x]=true;});return Object.keys(o);}
function label(b){var n=b.b,f=b.filter,name=!own(b,'filter')?'미확인':f==null?'미설정':f,enabled=b.enabled!==false;
 if(/conduit|liquid-(junction|router|container|tank)/.test(n))return '액체 연결 후보 · 압력/잔량/액체 호환 조건 · 유량 미측정';
 if(n==='sorter'||n==='inverted-sorter'){var straight=(n==='sorter')===enabled;return '필터 '+name+' · 일치: '+(straight?'직진':'좌우')+' / 불일치: '+(straight?'좌우':'직진')+' · 수신 가능할 때';}
 if(/^(over|under)flow-(gate|duct)$/.test(n)){var side=n.indexOf('underflow')===0;if(/gate$/.test(n)&&!enabled)side=!side;return (side?'좌우 우선 → 양쪽 막히면 직진':'직진 우선 → 막히면 좌우')+' · 동시 유량 보장 아님';}
 if(n==='duct-router'||n==='surge-router')return '후면 입력 · 필터 '+name+' · '+(f==null?'미설정: 앞/좌/우 분배':'일치 직진 / 나머지 좌우');
 if(n==='unloader'||n==='duct-unloader')return (n==='duct-unloader'?'뒤에서 꺼내 앞으로 전달 · 코어 추출 불가':'인접 시설에서 꺼내 분배 · 저장고로 반출 불가')+' · 자원 '+name+' · 재고/수신량 조건부';
 if(n==='plastanium-conveyor'||n==='surge-conveyor')return '묶음 운송 · '+({0:'운송 구간',1:'적재 지점',2:'하역 지점'}[b.stack_state]||'상태 미확인');
 if(n==='bridge-conveyor'||n==='phase-conveyor'||n==='duct-bridge'||n==='mass-driver')return (n==='duct-bridge'?'자동 전방 링크':'명시 링크')+' · 전송 준비/수신 공간 조건부';
 if(n==='armored-duct')return '후면 입력 / 나머지는 덕트 계열의 전방 출력만 입력 가능';
 if(n==='item-source')return '샌드박스 자원 공급: '+name;return null;
}
exports.build=function(doc){
 var g=T.analyze(doc),l=T.analyzeLiquids(doc),lc={};Object.keys(l.ports).forEach(function(i){lc[key(l.ports[i].cell)]=true;});
 g.diagnostics=g.diagnostics.filter(function(d){return !(d.code==='UNSUPPORTED_BLOCK'&&lc[key(d.cell||[])]);});Object.keys(l.ports).forEach(function(i){g.ports[i]=l.ports[i];});['edges','lines','diagnostics','edge_conditions'].forEach(function(f){g[f]=g[f].concat(l[f]);});
 var ports=g.ports,lines=[],index={},issues={},forward={},reverse={},at={},edgeLines={},markers={},rules={},selection={},ends={},contexts={},contextBadges={},cache=[];
 g.diagnostics.forEach(function(d){if(d.cell)(issues[key(d.cell)]||(issues[key(d.cell)]=[])).push(d.code);});
 g.lines.forEach(function(line,i){var path=line.ports,ep=[ports[path[0]],ports[path[path.length-1]]],codes=[];line.cells.forEach(function(c){codes=codes.concat(issues[key(c)]||[]);});
  lines.push({medium:ep[0].medium||'item',cells:line.cells,points:path.map(function(p){return ports[p].center;}),ends:ep.map(function(e){return {block:e.block,cell:e.cell,port:e.port,kind:e.kind,medium:e.medium||'item'};}),issues:unique(codes).sort(),cycle:line.cycle,badges:[]});
  unique(line.cells.map(key)).forEach(function(k){(index[k]||(index[k]=[])).push(i);});for(var j=1;j<path.length;j++)(edgeLines[path[j-1]+'>'+path[j]]||(edgeLines[path[j-1]+'>'+path[j]]=[])).push(i);
 });
 g.edges.forEach(function(e){(forward[e[0]]||(forward[e[0]]=[])).push(e[1]);(reverse[e[1]]||(reverse[e[1]]=[])).push(e[0]);});Object.keys(ports).forEach(function(i){(at[key(ports[i].cell)]||(at[key(ports[i].cell)]=[])).push(i);});
 var badgeSet={};g.edge_conditions.forEach(function(c){if(c.kind!=='filter'&&c.kind!=='duct_filter')return;if(c.kind==='filter'&&!reverse[c.source])return;var a=ports[c.source],targets=c.kind==='filter'?(forward[c.target]||[]).filter(function(t){return key(ports[t].cell)!==key(a.cell);}).map(function(t){return [c.target,t];}):[[c.source,c.target]];
  targets.forEach(function(e){var mode;if(!c.known)mode='unknown';else if(c.item==null){if(c.kind==='filter'&&c.match)return;mode='all';}else mode=c.match?'match':'other';var contextual={source:e[0],target:e[1],item:c.item,mode:mode,start:ports[e[0]].center,end:ports[e[1]].center,via:c.source+'>'+c.target,gate:key(a.cell)};
  (edgeLines[e[0]+'>'+e[1]]||[]).forEach(function(i){(contextBadges[i]||(contextBadges[i]=[])).push(contextual);});
  var k=e[0]+'>'+e[1]+'|'+mode+'|'+c.item;if(badgeSet[k])return;badgeSet[k]=true;var badge={source:e[0],target:e[1],item:c.item,mode:mode,start:ports[e[0]].center,end:ports[e[1]].center};(edgeLines[e[0]+'>'+e[1]]||[]).forEach(function(i){lines[i].badges.push(badge);});});
 });
 var bs={},explicit={'bridge-conveyor':1,'phase-conveyor':1,'bridge-conduit':1,'phase-conduit':1,'mass-driver':1},actual={},incoming={};(doc.buildings||[]).forEach(function(b){bs[b.x+','+b.y]=b;var rule=label(b);if(rule)rules[b.x+','+b.y]=rule;});
 g.edges.forEach(function(e){var a=key(ports[e[0]].cell),z=key(ports[e[1]].cell);actual[a+'>'+z]=true;if(bs[a]&&bs[z]&&bs[a].b===bs[z].b&&Array.isArray(bs[a].link)&&key(bs[a].link)===z)incoming[z]=true;});
 Object.keys(bs).forEach(function(k){var b=bs[k];if(!explicit[b.b])return;if(!index[k])index[k]=[];var state,text;if(!own(b,'link')){state='UNKNOWN';text='링크 정보 미확인';}else if(b.link===null){state=incoming[k]?'RECEIVING':'UNLINKED';text=incoming[k]?'수신 끝점 · 다음 링크 없음':'연결 없음 · 다리 인식됨';}else{var valid=actual[k+'>'+key(b.link)];state=valid?'LINKED':'INVALID';text=valid?'다리 연결됨':'유효하지 않은 다리 연결';}var o=(b.size||1)%2===0?.5:0;markers[k]={center:[b.x+o,b.y+o],state:state,label:text};});
 function select(k){if(own(selection,k))return selection[k];var seeds=at[k]||[],seedSet={},traversed={},walks=[{},{}];seeds.forEach(function(i){seedSet[i]=true;});[forward,reverse].forEach(function(adj,back){var todo=seeds.slice(),seen={};seeds.forEach(function(i){seen[i]=true;});while(todo.length){var a=todo.pop(),kind=ports[a].kind;if(!seedSet[a]&&kind!=='transport'&&kind!=='branch'&&kind!=='conditional')continue;(adj[a]||[]).forEach(function(z){var edge=back?z+'>'+a:a+'>'+z;traversed[edge]=true;walks[back][edge]=true;if(!seen[z]){seen[z]=true;todo.push(z);}});}});
  var selected={},ep={};Object.keys(traversed).forEach(function(e){(edgeLines[e]||[]).forEach(function(i){selected[i]=true;});});var ids=Object.keys(selected).map(Number).sort(function(a,b){return a-b;});ids.forEach(function(i){lines[i].ends.forEach(function(e){if(e.kind==='transport'||e.kind==='branch'||e.kind==='conditional')return;ep[key(e.cell)+':'+e.port+':'+e.medium]=e;});});var forwardGates={};Object.keys(walks[0]).forEach(function(e){var a=e.split('>')[0];if(ports[a]&&/^in[0-3]$/.test(ports[a].port))forwardGates[key(ports[a].cell)]=true;});contexts[k]={walks:walks,forwardGates:forwardGates};selection[k]=ids;ends[k]=Object.keys(ep).map(function(i){return ep[i];});cache.push(k);if(cache.length>32){var old=cache.shift();delete selection[old];delete ends[old];delete contexts[old];}return ids;
 }

 function badges(k,lineId){
  if(!contextBadges[lineId])return [];select(k);var walks=contexts[k].walks,seeds=at[k]||[];
  // Hovering the filter itself has no chosen ingress: ask for an input line.
  if(seeds.some(function(i){return ports[i].block==='sorter'||ports[i].block==='inverted-sorter';}))return [];
  var out=[],seen={},forwardGates=contexts[k].forwardGates;
  (contextBadges[lineId]||[]).forEach(function(b){
   if(!walks[0][b.via]&&(forwardGates[b.gate]||!walks[1][b.via]))return;
   var id=b.source+'>'+b.target+'|'+b.mode+'|'+b.item;if(seen[id])return;seen[id]=true;out.push(b);
  });
  // A downstream hover may have several real ingress directions. Do not stack
  // contradictory labels at one arrow or pretend one ingress was selected.
  var counts={};out.forEach(function(b){var e=b.source+'>'+b.target;counts[e]=(counts[e]||0)+1;});
  return out.filter(function(b){return counts[b.source+'>'+b.target]===1;});
 }
 return {version:'standalone/1.0.1',map:doc.map,session:doc.session,revision:doc.revision,lines:lines,index:index,issues:issues,selection:selection,ends:ends,rules:rules,markers:markers,ports:Object.keys(ports).length,edge_conditions:g.edge_conditions,flow_validation:'NOT_MEASURED',select:select,badges:badges};
};

// Matches the midpoint used by the arrow renderer, in world coordinates.
exports.badgePosition=function(b){return [(b.start[0]+b.end[0])*4,(b.start[1]+b.end[1])*4];};
