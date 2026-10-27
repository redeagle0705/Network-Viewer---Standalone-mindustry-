// Optional, READ-ONLY hover viewer. No commands, builds, configuration or resource edits.
(function(){
    if(this.__mindustryNetworkOverlayLoaded)return;
    this.__mindustryNetworkOverlayLoaded=true;
    var Core=Packages.arc.Core, Draw=Packages.arc.graphics.g2d.Draw, Lines=Packages.arc.graphics.g2d.Lines;
    var Color=Packages.arc.graphics.Color, KeyCode=Packages.arc.input.KeyCode;
    var Model=require('overlay-model');
    var Power=require('power-view'), modes={item:'On Mouse',liquid:'On Mouse',power:'On Mouse'}, powerData=null,lastPower=0,powerError='';
    var modeNames=['On Mouse','ALL','None'];
    for(var mk in modes){var saved=String(Core.settings.getString('network-view-'+mk,'On Mouse'));if(modeNames.indexOf(saved)>=0)modes[mk]=saved;}
    var enabled=true,lastExport=0,revision=0,geometry='',data=null,error='';
    var cyan=Color.valueOf('66e6ff'),amber=Color.valueOf('ffc65c'),red=Color.valueOf('ff687b'),violet=Color.valueOf('c79aff');
    var World=require('world-reader'),Focus=require('focus-scan'),Display=require('display-cache');
    var focusJob=null,focusKey='',focusRows=[],focusWatch={},focusKeys=[],pollAt=0,polling=false,lastFocusPoll=0;
    var compiledModel=null,allModels=[],allDisplay=Display.empty(),allFingerprints={},allShape='',focusModel=null,powerJob=null,powerKey='',activeTeam='',allJob=null,allRows=[],allKey='',lastAllPoll=0,allLimited=false,needCompile=false;
    var scans={row_reads:0,focus_jobs:0,all_jobs:0,full_scans:0,power_reads:0,power_scope:0},focusStats={},lastScanMs=0;
    function clockMs(){return Number(java.lang.System.nanoTime())/1000000;}
    function compile(rows,now){
        rows.sort(function(a,b){return a.y-b.y||a.x-b.x;});
        var team=Vars.player.team(),name=Vars.state.map==null?'unknown':String(Vars.state.map.name());
        var shape=JSON.stringify([name,Vars.world.width(),Vars.world.height(),String(team.name),rows]);
        if(shape===geometry&&compiledModel!==null){data=compiledModel;return;}
        revision++;data=null;
        var doc={map:name,width:Vars.world.width(),height:Vars.world.height(),tick:Number(Vars.state.tick),buildings:rows,buildings_complete:!focusStats.limited,scope_partial:!!focusStats.limited,stable_unload_ports:true,coverage:'visible and hovered connection context',session:1,revision:revision,captured_ms:now};
        var started=Number(java.lang.System.nanoTime());
        data=Model.build(doc);data.lines.forEach(function(l){var box=[Infinity,Infinity,-Infinity,-Infinity];l.points.forEach(function(p){box[0]=Math.min(box[0],p[0]*8);box[1]=Math.min(box[1],p[1]*8);box[2]=Math.max(box[2],p[0]*8);box[3]=Math.max(box[3],p[1]*8);});l.bounds=box;l.bad=l.issues.some(function(c){return /OPEN_|INVALID_|BLOCKED_|CYCLE/.test(c);});});lastBuildMs=(Number(java.lang.System.nanoTime())-started)/1000000;geometry=shape;compiledModel=data;error='';
    }

    // Explicit diagnostic export only. The update/draw paths never call this.
    function snapshot(now){var rows=[];scans.full_scans++;Vars.player.team().data().buildings.each(function(b){rows.push(World.row(b));});compile(rows,now);}
    function meta(){return {map:String(Vars.state.map.name()),width:Number(Vars.world.width()),height:Number(Vars.world.height())};}
    function beginFocus(k){
        var signatures={},near={};scans.focus_jobs++;
        function read(key){var b=World.get(key);if(b==null){signatures[key]='missing';return null;}scans.row_reads++;var r=World.row(b);near[key]=World.neighbors(r);signatures[key]=JSON.stringify(r)+'|'+near[key].join(';');return r;}
        focusJob={scan:Focus.create(meta(),k,read,function(r){var key=r.x+','+r.y;if(!near[key])read(key);return near[key]||[];},{item:modes.item!=='None',liquid:modes.liquid!=='None'}),signatures:signatures,key:k};focusKey=k;polling=false;
    }
    function resetScans(){compiledModel=null;allModels=[];allDisplay=Display.empty();allFingerprints={};allShape='';focusModel=null;powerJob=null;powerKey='';focusStats={};allLimited=false;focusJob=null;focusKey='';focusRows=[];focusWatch={};focusKeys=[];allJob=null;allRows=[];allKey='';lastAllPoll=0;lastFocusPoll=0;geometry='';data=null;needCompile=false;World.clear();}
    function rectKey(rect){return rect.join(',');}
    function updateView(now,hover,rect){
        var teamKey=String(Vars.player.team().id);if(activeTeam!==teamKey){resetScans();powerData=null;lastPower=0;activeTeam=teamKey;}
        var begun=clockMs(),deadline=begun+3,focusWanted=hover!=null&&hover.team==Vars.player.team()&&((modes.item!=='None'&&hover.block.hasItems)||(modes.liquid!=='None'&&hover.block.hasLiquids));
        var k=focusWanted?hover.tile.x+','+hover.tile.y:'';
        if(k!==focusKey){focusJob=null;focusModel=null;focusRows=[];focusWatch={};focusKeys=[];focusKey=k;focusStats={};needCompile=true;if(k)beginFocus(k);}
        if(k&&focusJob==null&&!polling&&now-lastFocusPoll>=1200){polling=true;pollAt=0;}
        if(k&&polling){var reads=0;while(pollAt<focusKeys.length&&reads++<24&&clockMs()<deadline){var key=focusKeys[pollAt++];scans.row_reads++;if(World.signature(key)!==focusWatch[key]){beginFocus(k);break;}}if(polling&&pollAt>=focusKeys.length){polling=false;lastFocusPoll=now;}}
        if(focusJob&&clockMs()<deadline){var job=focusJob;if(job.scan.step(16,deadline,clockMs)){focusRows=job.scan.rows();focusStats=job.scan.stats();focusWatch=job.signatures;focusKeys=Object.keys(focusWatch);focusJob=null;lastFocusPoll=now;compile(focusRows,now);focusModel=data;needCompile=true;}}
        var allWanted=modes.item==='ALL'||modes.liquid==='ALL',rk=rectKey(rect);
        if(!allWanted&&(allRows.length||allJob)){allJob=null;allRows=[];allModels=[];allDisplay=Display.empty();allFingerprints={};allShape='';allKey='';needCompile=true;}
        if(allWanted&&((allJob&&allJob.key!==rk)||(!allJob&&(allKey!==rk||now-lastAllPoll>=1500)))){
            var queryStarted=clockMs(),builds=World.visible(rect).filter(function(b){return b.block.hasItems||b.block.hasLiquids;}),cx=rect[0]+rect[2]/2,cy=rect[1]+rect[3]/2;
            allLimited=builds.length>4096;if(allLimited){var bins=[],near=[];builds.forEach(function(b){var dx=b.x-cx,dy=b.y-cy,i=Math.floor(Math.sqrt(dx*dx+dy*dy)/32);(bins[i]||(bins[i]=[])).push(b);});for(var bi=0;bi<bins.length&&near.length<4096;bi++)if(bins[bi])for(var bj=0;bj<bins[bi].length&&near.length<4096;bj++)near.push(bins[bi][bj]);builds=near;}
            scans.all_query_max_ms=Math.max(scans.all_query_max_ms||0,clockMs()-queryStarted);allJob={key:rk,builds:builds,at:0,rows:[],phase:'read',cache:{},signatures:{},changed:false};scans.all_jobs++;
        }
        if(allJob&&allJob.phase==='read'){var n=0;while(allJob.at<allJob.builds.length&&n++<32&&clockMs()<deadline){var b=allJob.builds[allJob.at++];if(b.tile!=null&&b.tile.build==b){var row=World.row(b),key=row.x+','+row.y,sig=JSON.stringify(row);allJob.rows.push(row);allJob.cache[key]=row;allJob.signatures[key]=sig;if(sig!==allFingerprints[key])allJob.changed=true;scans.row_reads++;}}
            if(allJob.at>=allJob.builds.length){if(!allJob.changed&&allJob.rows.length===allRows.length){allKey=allJob.key;allJob=null;lastAllPoll=now;}else{allJob.rows.sort(function(a,b){return a.y-b.y||a.x-b.x;});allJob.display=Display.empty();allJob.phase='model';allJob.at=0;}}}
        else if(allJob&&allJob.phase==='model'){
            var chunkStarted=clockMs(),job=allJob,primary={},context={},roots=job.rows.slice(job.at,job.at+32);job.at+=roots.length;
            function add(k){if(!Object.prototype.hasOwnProperty.call(job.cache,k)){var b=World.get(k);job.cache[k]=b==null?null:World.row(b);scans.row_reads++;}if(job.cache[k])context[k]=job.cache[k];}
            roots.forEach(function(r){var k=r.x+','+r.y;primary[k]=true;add(k);World.neighbors(r).forEach(add);});
            Object.keys(context).forEach(function(k){World.neighbors(context[k]).forEach(add);});
            var md=meta();md.buildings=Object.keys(context).map(function(k){return context[k];});md.buildings_complete=false;md.scope_partial=true;md.stable_unload_ports=true;
            var chunk=Display.chunk(Model.build(md),primary);Display.append(job.display,chunk);scans.all_chunk_ms=clockMs()-chunkStarted;scans.all_chunk_max_ms=Math.max(scans.all_chunk_max_ms||0,scans.all_chunk_ms);
            if(job.at>=job.rows.length){allDisplay=job.display;allRows=job.rows;needCompile=true;allFingerprints=job.signatures;allKey=job.key;allJob=null;lastAllPoll=now;}
        }
        if(needCompile){data=allWanted?Display.compose(allDisplay,focusModel,++revision):focusModel;needCompile=false;}
        var powerWanted=modes.power==='ALL'||modes.power==='On Mouse'&&hover!=null&&hover.team==Vars.player.team()&&hover.power!=null;
        var pk=!powerWanted?'':modes.power==='ALL'?'ALL:'+rk:'grid:'+String(hover.power.graph.getID());
        if(pk!==powerKey){powerJob=null;if(pk.indexOf('ALL:')!==0||powerKey.indexOf('ALL:')!==0)powerData=null;lastPower=0;powerKey=pk;}
        if(!powerWanted){powerData=null;powerError='';lastPower=0;scans.power_scope=0;}
        else try{
            if(powerJob==null&&now-lastPower>=750){var bs;if(modes.power==='On Mouse')bs=hover.power.graph.all;else{bs=new Packages.arc.struct.Seq();var added={};function addPower(b){if(b!=null&&b.power!=null&&!added[b.pos()]){added[b.pos()]=true;bs.add(b);}}World.visible(rect).forEach(function(b){if(b.power!=null){addPower(b);b.getPowerConnections(new Packages.arc.struct.Seq()).each(addPower);}});}scans.power_scope=Number(bs.size);scans.power_reads++;powerJob=Power.begin(Vars.player.team(),bs);}
            if(powerJob&&powerJob.step(128,clockMs()+2,clockMs)){powerData=powerJob.result();powerJob=null;lastPower=now;powerError='';}
        }catch(pe){powerJob=null;powerData=null;powerError=String(pe);lastPower=now;}
        lastScanMs=clockMs()-begun;scans.max_update_ms=Math.max(scans.max_update_ms||0,lastScanMs);if(allWanted)scans.max_all_update_ms=Math.max(scans.max_all_update_ms||0,lastScanMs);
    }
    function controls(){
        if(Vars.headless||Vars.ui==null)return;
        var panel=new Packages.arc.scene.ui.layout.Table();panel.setFillParent(true);panel.bottom().left().margin(12);
        panel.touchable=Packages.arc.scene.event.Touchable.childrenOnly;
        panel.update(run(function(){panel.visible=Vars.state.isGame();}));
        function addMode(title,key){
            var button=new Packages.arc.scene.ui.TextButton(title+': '+modes[key],Packages.mindustry.ui.Styles.flatt);
            button.clicked(run(function(){modes[key]=modeNames[(modeNames.indexOf(modes[key])+1)%3];Core.settings.put('network-view-'+key,modes[key]);button.setText(title+': '+modes[key]);enabled=true;lastPower=0;resetScans();status();}));
            panel.add(button).width(210).height(34).pad(2);panel.row();
        }
        addMode('아이템','item');addMode('유체','liquid');addMode('전력','power');Vars.ui.hudGroup.addChild(panel);
    }
    Events.on(Packages.mindustry.game.EventType.ClientLoadEvent,cons(function(){controls();}));
    function inView(x,y){return Math.abs(x-Core.camera.position.x)<Core.camera.width/2+32&&Math.abs(y-Core.camera.position.y)<Core.camera.height/2+32;}
    function visibleLine(l){var b=l.bounds;return !b||!(b[2]<Core.camera.position.x-Core.camera.width/2-32||b[0]>Core.camera.position.x+Core.camera.width/2+32||b[3]<Core.camera.position.y-Core.camera.height/2-32||b[1]>Core.camera.position.y+Core.camera.height/2+32);}
    function drawPower(key){
        if(modes.power==='None')return '';
        if(powerError)return '\n[scarlet]전력 읽기 오류: '+powerError;
        if(powerData==null)return '\n전력망 읽는 중';
        var selected=Power.selectGrids(powerData,key,modes.power),grids={};for(var i=0;i<selected.length;i++)grids[selected[i]]=true;
        for(var e=0;e<powerData.edges.length;e++){
            var edge=powerData.edges[e];if(!grids[edge.grid])continue;
            var a=powerData.nodes[edge.from],b=powerData.nodes[edge.to],ax=a.center[0]*8,ay=a.center[1]*8,bx=b.center[0]*8,by=b.center[1]*8;
            if((ax<Core.camera.position.x-Core.camera.width/2-32&&bx<Core.camera.position.x-Core.camera.width/2-32)||(ax>Core.camera.position.x+Core.camera.width/2+32&&bx>Core.camera.position.x+Core.camera.width/2+32)||(ay<Core.camera.position.y-Core.camera.height/2-32&&by<Core.camera.position.y-Core.camera.height/2-32)||(ay>Core.camera.position.y+Core.camera.height/2+32&&by>Core.camera.position.y+Core.camera.height/2+32))continue;
            Draw.color(edge.kind==='adjacent'?Color.white:amber);Lines.stroke(edge.kind==='adjacent'?1.6:1);
            if(edge.kind==='adjacent')Lines.line(ax,ay,bx,by);else Lines.dashLine(ax,ay,bx,by,Math.max(2,Math.floor(Math.sqrt((bx-ax)*(bx-ax)+(by-ay)*(by-ay))/4)));
        }
        for(var nk in powerData.nodes){var n=powerData.nodes[nk];if(modes.power==='ALL'&&8*Core.graphics.getWidth()/Core.camera.width<4&&nk!==key)continue;if(!grids[n.grid]||!inView(n.center[0]*8,n.center[1]*8))continue;
            Draw.color(n.role==='generator'?Color.lime:n.role==='battery'?amber:n.role==='consumer'&&n.satisfaction<.98?red:cyan);Lines.stroke(nk===key?2:1);Lines.square(n.center[0]*8,n.center[1]*8,n.size*4+.6);
        }
        var hovered=powerData.nodes[key];if(!hovered)return '';
        var g=powerData.grids[hovered.grid],text='\n[accent]전력망 '+(g.total_nodes||g.nodes.length)+'개 건물 · 점선:노드 / 실선:인접';
        text+='\n[white]공급 '+g.produced.toFixed(1)+'/s · 수요 '+g.needed.toFixed(1)+'/s';
        if(g.capacity>0)text+='\n배터리 '+g.stored.toFixed(0)+' / '+g.capacity.toFixed(0);
        if(g.nodes.length===1)text+='\n[yellow]연결된 다른 전력 건물 없음';
        if(hovered.role==='consumer')text+='\n전력 충족 '+(hovered.satisfaction*100).toFixed(0)+'%';
        return text;
    }
    var lastBuildMs=0;
    this.__networkViewerDiagnostics=function(){return {version:'1.1.2',standalone:true,power_pending:powerJob!==null,scans:scans,focus:focusStats,focus_key:focusKey,focus_pending:focusJob!==null,all_rows:allRows.length,all_limited:allLimited,scan_ms:lastScanMs,ready:data!==null,lines:data===null?0:data.lines.length,revision:revision,build_ms:lastBuildMs,error:error,power_error:powerError,modes:{item:modes.item,liquid:modes.liquid,power:modes.power}};};
    function status(){} // Settings persist via Core.settings; no external files/processes.
    Events.on(Packages.mindustry.game.EventType.WorldLoadEvent,cons(function(){resetScans();powerData=null;lastExport=0;lastPower=0;error='';powerError='';}));
    Events.run(Trigger.update,run(function(){
        try{
            var now=Number(java.lang.System.currentTimeMillis());
            if(Core.input.keyTap(KeyCode.f7))enabled=!enabled;
            if(!enabled||Vars.state.isMenu()||Vars.player==null)return;
            if(modes.item==='None'&&modes.liquid==='None'&&modes.power==='None')return;
            var tile=Vars.world.tileWorld(Core.input.mouseWorldX(),Core.input.mouseWorldY()),hover=tile==null||Core.scene!=null&&Core.scene.hasMouse()?null:tile.build,halo=(modes.item==='ALL'||modes.liquid==='ALL'||modes.power==='ALL')?World.halo():0;
            var left=Math.floor((Core.camera.position.x-Core.camera.width/2)/64)*64-halo,bottom=Math.floor((Core.camera.position.y-Core.camera.height/2)/64)*64-halo;
            var right=Math.ceil((Core.camera.position.x+Core.camera.width/2)/64)*64+halo,top=Math.ceil((Core.camera.position.y+Core.camera.height/2)/64)*64+halo;
            updateView(now,hover,[left,bottom,right-left,top-bottom]);
        }catch(e){data=null;geometry='';error=String(e);}
    }));
    function changed(){lastFocusPoll=0;lastAllPoll=0;lastPower=0;}
    Events.on(Packages.mindustry.game.EventType.ConfigEvent,cons(changed));
    Events.on(Packages.mindustry.game.EventType.BlockBuildEndEvent,cons(changed));
    function label(end){var b=Vars.content.block(end.block);return (end.medium=='liquid'?'[액체] ':'')+(b==null?end.block:String(b.localizedName))+' ('+end.cell.join(',')+') '+end.port;}
    Events.run(Trigger.draw,run(function(){
        if(!enabled||Vars.state.isMenu()||Vars.player==null)return;
        var oldZ=Draw.z();
        try{
            var tile=Vars.world.tileWorld(Core.input.mouseWorldX(),Core.input.mouseWorldY());
            var b=tile==null?null:tile.build,x=b==null?(tile==null?-1:Number(tile.x)):Number(b.tile.x),y=b==null?(tile==null?-1:Number(tile.y)):Number(b.tile.y),key=x+','+y;
            var text='[F7] 연결 보기  '+x+','+y;
            Draw.z(Packages.mindustry.graphics.Layer.overlayUI+1);
            if(allJob)text+='\n[yellow]주변 연결 확인 중...';
            if(allLimited)text+='\n[yellow]큰 화면: 가까운 4,096개부터 표시 · 확대하면 상세 연결';
            if(focusStats.limited)text+='\n[yellow]연결망 탐색 한도 도달 · 부분 결과';
            if(error)text+='\n[scarlet]'+error;
            else if(data==null&&(modes.item!=='None'||modes.liquid!=='None'))text+='\n[yellow]연결망 읽는 중...';
            else if(data!=null&&(modes.item!=='None'||modes.liquid!=='None')){
                data.select(key);
                var ids=data.index[key]||[],issues=data.issues[key]||[],rule=data.rules[key];
                var marker=(data.markers||{})[key];
                if(marker&&b!=null&&((b.block.hasLiquids&&modes.liquid!=='None')||(b.block.hasItems&&modes.item!=='None'))){
                    text+='\n[accent]'+marker.label;
                    Draw.color(marker.state=='INVALID'?red:marker.state=='UNLINKED'?amber:cyan);
                    Lines.stroke(1.4);Lines.circle(marker.center[0]*8,marker.center[1]*8,3.2);
                }
                if(rule)text+='\n[accent]'+rule;
                if(b!=null&&(String(b.block.name)==='sorter'||String(b.block.name)==='inverted-sorter'))text+='\n[white]입력선에 마우스를 올리면 그 진입 방향의 자원만 표시';
                var selection=Power.selectLines(data.lines,data.selection[key]||ids,modes).filter(function(i){return visibleLine(data.lines[i]);});
                text+='\n'+ids.length+'개 접점 구간 / 연결선 묶음 · 조건부 후보 / 유량 미측정';
                if(issues.length)text+='\n[yellow]확인 필요: '+issues.slice(0,2).join(', ');
                var budget=10000,lastColor=null,pixelTile=8*Core.graphics.getWidth()/Core.camera.width;Lines.stroke(1.2);
                for(var k=0;k<selection.length;k++){
                    var line=data.lines[selection[k]],bad=line.bad;
                    var color=bad?red:line.medium=='liquid'?cyan:line.issues.length?amber:line.render_scope==='all'?violet:k%2?violet:cyan;
                    if(lastColor!==color){Draw.color(color);lastColor=color;}
                    for(var j=1;j<line.points.length&&budget>0;j++){
                        var a=line.points[j-1],c=line.points[j],ax=a[0]*8,ay=a[1]*8,cx=c[0]*8,cy=c[1]*8;
                        var dx=cx-ax,dy=cy-ay,len=Math.sqrt(dx*dx+dy*dy);if(len<.01)continue;
                        if(!inView((ax+cx)/2,(ay+cy)/2)&&!inView(ax,ay)&&!inView(cx,cy))continue;
                        budget--;if(len>12)Lines.dashLine(ax,ay,cx,cy,Math.max(2,Math.floor(len/3)));else Lines.line(ax,ay,cx,cy);
                        if(line.render_scope==='all'&&pixelTile<5)continue;
                        var mx=(ax+cx)/2,my=(ay+cy)/2,ux=dx/len,uy=dy/len;
                        Lines.line(mx,my,mx-ux*2-uy*1.3,my-uy*2+ux*1.3);Lines.line(mx,my,mx-ux*2+uy*1.3,my-uy*2-ux*1.3);
                    }

                }
                // Draw badges after arrows so the branch condition remains legible.
                Draw.color(Color.white);var badgeCount=0;
                var badgeSelection=data.badgeSelection?data.badgeSelection(key):selection;
                for(var bi=0;bi<badgeSelection.length&&badgeCount<100;bi++){
                    var badges=data.badges(key,badgeSelection[bi]);
                    for(var bj=0;bj<badges.length&&badgeCount++<100;bj++){
                        var badge=badges[bj],dx=badge.end[0]-badge.start[0],dy=badge.end[1]-badge.start[1],len=Math.sqrt(dx*dx+dy*dy);if(len<.01)continue;
                        var badgePoint=Model.badgePosition(badge),px=badgePoint[0],py=badgePoint[1];
                        if(!inView(px,py))continue;
                        var item=badge.item==null?null:Vars.content.item(badge.item);
                        if(item!=null){Draw.rect(item.fullIcon,px,py,3.4,3.4);if(badge.mode=='other')Packages.mindustry.ui.Fonts.outline.draw('≠',px+1.8,py+1.8,Color.white,.16,false,Packages.arc.util.Align.left);}
                        else Packages.mindustry.ui.Fonts.outline.draw(badge.mode=='all'?'전체':'?',px,py,Color.white,.14,false,Packages.arc.util.Align.center);
                    }
                }
                var ends=(data.ends[key]||[]).filter(function(e){return modes[e.medium==='liquid'?'liquid':'item']!=='None';});for(var ei=0;ei<ends.length&&ei<4;ei++)text+='\n'+label(ends[ei]);
                if(budget<=0)text+='\n[yellow]큰 연결망: 표시 한도 도달';
                if(modes.liquid!=='None'&&b!=null&&b.liquids!=null){var liquidStock=[];Vars.content.liquids().each(function(l){var amount=b.liquids.get(l);if(amount>.01)liquidStock.push(String(l.localizedName)+':'+amount.toFixed(1));});if(liquidStock.length)text+='\n액체 재고: '+liquidStock.slice(0,4).join(', ');}
                if(modes.item!=='None'&&b!=null&&b.items!=null){
                    var held=[];Vars.content.items().each(function(it){var count=b.items.get(it);if(count>0)held.push(String(it.localizedName)+':'+count);});
                    if(held.length)text+='\n현재 칸 재고: '+held.slice(0,5).join(', ');
                }
            }
            text+=drawPower(key);
            Draw.reset();
            if(tile!=null&&(b!=null||modes.item==='ALL'||modes.liquid==='ALL'||modes.power==='ALL')&&(modes.item!=='None'||modes.liquid!=='None'||modes.power!=='None'))Packages.mindustry.ui.Fonts.outline.draw(text,Core.input.mouseWorldX()+9,Core.input.mouseWorldY()+14,Color.white,.22,false,Packages.arc.util.Align.left);
        }catch(e){error='Draw: '+String(e);}
        finally{Draw.reset();Draw.z(oldZ);Lines.stroke(1);}
    }));
    print('Network Viewer Standalone 1.1.2 loaded. F7; Item/Liquid/Power. READ ONLY; NO HELPER.');
})();
