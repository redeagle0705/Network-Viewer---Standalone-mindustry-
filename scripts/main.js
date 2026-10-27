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
    function snapshot(now){
        var rows=[],team=Vars.player.team();
        team.data().buildings.each(function(b){
            var row={b:String(b.block.name),x:Number(b.tile.x),y:Number(b.tile.y),r:Number(b.rotation),size:Number(b.block.size),enabled:Boolean(b.enabled),can_unload:Boolean(b.canUnload()),is_duct:Boolean(b.block.isDuct)};
            var dist=Packages.mindustry.world.blocks.distribution,storage=Packages.mindustry.world.blocks.storage;
            if(b.block instanceof dist.Sorter||b.block instanceof dist.OverflowGate)row.r=0;
            if(b.block instanceof dist.MassDriver||b.block instanceof Packages.mindustry.world.blocks.defense.turrets.ItemTurret)row.r=0;
            if(b.block instanceof dist.Sorter||b.block instanceof dist.DuctRouter||b.block instanceof storage.Unloader){row.filter=b.sortItem==null?null:String(b.sortItem.name);}
            if(b.block instanceof dist.DirectionalUnloader)row.filter=b.unloadItem==null?null:String(b.unloadItem.name);
            if(b.block instanceof Packages.mindustry.world.blocks.sandbox.ItemSource)row.filter=b.outputItem==null?null:String(b.outputItem.name);
            if(b.block instanceof dist.StackConveyor){row.stack_state=Number(b.state);row.output_router=Boolean(b.block.outputRouter);}
            if(b.block instanceof dist.DirectionBridge)row.range_tiles=Number(b.block.range);
            if(b.block instanceof dist.ItemBridge)row.range_tiles=Number(b.block.range);
            if(b.block instanceof dist.MassDriver){row.range_tiles=Number(b.block.range)/8;row.link=b.link<0?null:[Number(Packages.arc.math.geom.Point2.x(b.link)),Number(Packages.arc.math.geom.Point2.y(b.link))];}
            if(b.block instanceof storage.StorageBlock)row.linked_core=b.linkedCore==null?null:[Number(b.linkedCore.tile.x),Number(b.linkedCore.tile.y)];
            if(b.block.hasItems){
                row.input_items=[];Vars.content.items().each(function(it){if(b.block.itemFilter!=null&&b.block.itemFilter[it.id])row.input_items.push(String(it.name));});
                var classes=[],cl=b.block.getClass();while(cl!=null){classes.push(String(cl.getSimpleName()));cl=cl.getSuperclass();}
                row.classes=classes;
                if(classes.indexOf('GenericCrafter')>=0){
                    row.item_role='consumer';row.output_items=[];
                    if(b.block.outputItems!=null)for(var oi=0;oi<b.block.outputItems.length;oi++)row.output_items.push(String(b.block.outputItems[oi].item.name));
                    if(row.output_items.length)row.item_role='producer';
                }else if(classes.indexOf('Separator')>=0){row.item_role='producer';row.output_items=[];for(var si=0;si<b.block.results.length;si++)row.output_items.push(String(b.block.results[si].item.name));
                }else if(classes.indexOf('ItemTurret')>=0||classes.indexOf('ConsumeGenerator')>=0||classes.indexOf('NuclearReactor')>=0||classes.indexOf('UnitFactory')>=0||classes.indexOf('Reconstructor')>=0||classes.indexOf('UnitAssembler')>=0){row.item_role='consumer';}
                else if(row.input_items.length>0&&classes.indexOf('Drill')<0&&classes.indexOf('BeamDrill')<0&&classes.indexOf('GenericCrafter')<0){row.item_role='consumer';}
                if(classes.indexOf('UnitFactory')>=0){row.input_items=[];row.unit_plan=Number(b.currentPlan);if(b.currentPlan>=0&&b.currentPlan<b.block.plans.size){var req=b.block.plans.get(b.currentPlan).requirements;for(var ri=0;ri<req.length;ri++)row.input_items.push(String(req[ri].item.name));}}
            }
            if(b.block instanceof Packages.mindustry.world.blocks.distribution.ItemBridge)row.link=b.link<0?null:[Number(Packages.arc.math.geom.Point2.x(b.link)),Number(Packages.arc.math.geom.Point2.y(b.link))];
            if(b.block.hasLiquids){
                row.liquid_inputs=[];row.liquid_outputs=[];
                Vars.content.liquids().each(function(l){if(b.block.liquidFilter!=null&&b.block.liquidFilter[l.id])row.liquid_inputs.push(String(l.name));});
                if(b.block instanceof Packages.mindustry.world.blocks.production.GenericCrafter&&b.block.outputLiquids!=null){
                    for(var li=0;li<b.block.outputLiquids.length;li++)row.liquid_outputs.push({liquid:String(b.block.outputLiquids[li].liquid.name),direction:li<b.block.liquidOutputDirections.length?Number(b.block.liquidOutputDirections[li]):-1});
                }
                if(b.block instanceof Packages.mindustry.world.blocks.production.Pump){
                    row.liquid_role='source';var output=b.block instanceof Packages.mindustry.world.blocks.production.SolidPump?b.block.result:b.liquidDrop;
                    if(output!=null)row.liquid_outputs.push({liquid:String(output.name),direction:-1});
                }else if(row.liquid_inputs.length||row.liquid_outputs.length)row.liquid_role='facility';
            }
            rows.push(row);
        });
        rows.sort(function(a,b){return a.y-b.y||a.x-b.x;});
        var name=Vars.state.map==null?'unknown':String(Vars.state.map.name());
        var shape=JSON.stringify([name,Vars.world.width(),Vars.world.height(),String(team.name),rows]);
        if(shape===geometry&&data!==null)return;
        revision++;data=null;
        var doc={map:name,width:Vars.world.width(),height:Vars.world.height(),tick:Number(Vars.state.tick),buildings:rows,buildings_complete:true,coverage:'own-team buildings',session:1,revision:revision,captured_ms:now};
        var started=Number(java.lang.System.nanoTime());
        data=Model.build(doc);lastBuildMs=(Number(java.lang.System.nanoTime())-started)/1000000;geometry=shape;error='';
    }
    function controls(){
        if(Vars.headless||Vars.ui==null)return;
        var panel=new Packages.arc.scene.ui.layout.Table();panel.setFillParent(true);panel.bottom().left().margin(12);
        panel.touchable=Packages.arc.scene.event.Touchable.childrenOnly;
        panel.update(run(function(){panel.visible=Vars.state.isGame();}));
        function addMode(title,key){
            var button=new Packages.arc.scene.ui.TextButton(title+': '+modes[key],Packages.mindustry.ui.Styles.flatt);
            button.clicked(run(function(){modes[key]=modeNames[(modeNames.indexOf(modes[key])+1)%3];Core.settings.put('network-view-'+key,modes[key]);button.setText(title+': '+modes[key]);enabled=true;lastPower=0;status();}));
            panel.add(button).width(210).height(34).pad(2);panel.row();
        }
        addMode('아이템','item');addMode('유체','liquid');addMode('전력','power');Vars.ui.hudGroup.addChild(panel);
    }
    Events.on(Packages.mindustry.game.EventType.ClientLoadEvent,cons(function(){controls();}));
    function inView(x,y){return Math.abs(x-Core.camera.position.x)<Core.camera.width/2+32&&Math.abs(y-Core.camera.position.y)<Core.camera.height/2+32;}
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
        for(var nk in powerData.nodes){var n=powerData.nodes[nk];if(!grids[n.grid]||!inView(n.center[0]*8,n.center[1]*8))continue;
            Draw.color(n.role==='generator'?Color.lime:n.role==='battery'?amber:n.role==='consumer'&&n.satisfaction<.98?red:cyan);Lines.stroke(nk===key?2:1);Lines.square(n.center[0]*8,n.center[1]*8,n.size*4+.6);
        }
        var hovered=powerData.nodes[key];if(!hovered)return '';
        var g=powerData.grids[hovered.grid],text='\n[accent]전력망 '+g.nodes.length+'개 건물 · 점선:노드 / 실선:인접';
        text+='\n[white]공급 '+g.produced.toFixed(1)+'/s · 수요 '+g.needed.toFixed(1)+'/s';
        if(g.capacity>0)text+='\n배터리 '+g.stored.toFixed(0)+' / '+g.capacity.toFixed(0);
        if(g.nodes.length===1)text+='\n[yellow]연결된 다른 전력 건물 없음';
        if(hovered.role==='consumer')text+='\n전력 충족 '+(hovered.satisfaction*100).toFixed(0)+'%';
        return text;
    }
    var lastBuildMs=0;
    this.__networkViewerDiagnostics=function(){return {version:'1.0.1',standalone:true,ready:data!==null,lines:data===null?0:data.lines.length,revision:revision,build_ms:lastBuildMs,error:error,power_error:powerError,modes:{item:modes.item,liquid:modes.liquid,power:modes.power}};};
    function status(){} // Settings persist via Core.settings; no external files/processes.
    Events.on(Packages.mindustry.game.EventType.WorldLoadEvent,cons(function(){geometry='';data=null;powerData=null;lastExport=0;lastPower=0;error='';powerError='';}));
    Events.run(Trigger.update,run(function(){
        try{
            var now=Number(java.lang.System.currentTimeMillis());
            if(Core.input.keyTap(KeyCode.f7))enabled=!enabled;
            if(!enabled||Vars.state.isMenu()||Vars.player==null)return;
            if(modes.power!=='None'&&now-lastPower>=500){lastPower=now;try{powerData=Power.read(Vars.player.team());powerError='';}catch(pe){powerData=null;powerError=String(pe);}}
            if((modes.item!=='None'||modes.liquid!=='None')&&now-lastExport>=1000){lastExport=now;snapshot(now);}
        }catch(e){data=null;geometry='';error=String(e);}
    }));
    function label(end){var b=Vars.content.block(end.block);return (end.medium=='liquid'?'[액체] ':'')+(b==null?end.block:String(b.localizedName))+' ('+end.cell.join(',')+') '+end.port;}
    Events.run(Trigger.draw,run(function(){
        if(!enabled||Vars.state.isMenu()||Vars.player==null)return;
        var oldZ=Draw.z();
        try{
            var tile=Vars.world.tileWorld(Core.input.mouseWorldX(),Core.input.mouseWorldY());
            var b=tile==null?null:tile.build,x=b==null?(tile==null?-1:Number(tile.x)):Number(b.tile.x),y=b==null?(tile==null?-1:Number(tile.y)):Number(b.tile.y),key=x+','+y;
            var text='[F7] 연결 보기  '+x+','+y;
            Draw.z(Packages.mindustry.graphics.Layer.overlayUI+1);
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
                var selection=Power.selectLines(data.lines,data.selection[key]||ids,modes);
                text+='\n'+ids.length+'개 접점 구간 / 연결선 묶음 · 조건부 후보 / 유량 미측정';
                if(issues.length)text+='\n[yellow]확인 필요: '+issues.slice(0,2).join(', ');
                var budget=10000;
                for(var k=0;k<selection.length;k++){
                    var line=data.lines[selection[k]],bad=false;
                    for(var t=0;t<line.issues.length;t++)if(/OPEN_|INVALID_|BLOCKED_|CYCLE/.test(line.issues[t]))bad=true;
                    var color=bad?red:line.medium=='liquid'?cyan:line.issues.length?amber:k%2?violet:cyan;
                    Draw.color(color);Lines.stroke(1.2);
                    for(var j=1;j<line.points.length&&budget-->0;j++){
                        var a=line.points[j-1],c=line.points[j],ax=a[0]*8,ay=a[1]*8,cx=c[0]*8,cy=c[1]*8;
                        var dx=cx-ax,dy=cy-ay,len=Math.sqrt(dx*dx+dy*dy);if(len<.01)continue;
                        if(!inView((ax+cx)/2,(ay+cy)/2)&&!inView(ax,ay)&&!inView(cx,cy))continue;
                        if(len>12)Lines.dashLine(ax,ay,cx,cy,Math.max(2,Math.floor(len/3)));else Lines.line(ax,ay,cx,cy);
                        var mx=(ax+cx)/2,my=(ay+cy)/2,ux=dx/len,uy=dy/len;
                        Lines.line(mx,my,mx-ux*2-uy*1.3,my-uy*2+ux*1.3);Lines.line(mx,my,mx-ux*2+uy*1.3,my-uy*2-ux*1.3);
                    }

                }
                // Draw badges after arrows so the branch condition remains legible.
                Draw.color(Color.white);var badgeCount=0;
                for(var bi=0;bi<selection.length&&badgeCount<100;bi++){
                    var badges=data.badges(key,selection[bi]);
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
            if(tile!=null&&(modes.item!=='None'||modes.liquid!=='None'||modes.power!=='None'))Packages.mindustry.ui.Fonts.outline.draw(text,Core.input.mouseWorldX()+9,Core.input.mouseWorldY()+14,Color.white,.22,false,Packages.arc.util.Align.left);
        }catch(e){error='Draw: '+String(e);}
        finally{Draw.reset();Draw.z(oldZ);Lines.stroke(1);}
    }));
    print('Network Viewer Standalone 1.0.1 loaded. F7; Item/Liquid/Power. READ ONLY; NO HELPER.');
})();
