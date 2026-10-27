/* Live engine adapter. No file I/O, commands, or whole-team scan. */
var infoCache={};
function blockInfo(block){var k=String(block.id);if(infoCache[k])return infoCache[k];var c=[],it=[],ls=[],cl=block.getClass();while(cl!=null){c.push(String(cl.getSimpleName()));cl=cl.getSuperclass();}Vars.content.items().each(function(i){if(block.itemFilter!=null&&block.itemFilter[i.id])it.push(String(i.name));});Vars.content.liquids().each(function(l){if(block.liquidFilter!=null&&block.liquidFilter[l.id])ls.push(String(l.name));});return infoCache[k]={classes:c,items:it,liquids:ls};}
exports.row=function(b){
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
                var info=blockInfo(b.block);row.input_items=info.items;var classes=info.classes;
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
                row.liquid_inputs=blockInfo(b.block).liquids;
                if(b.block instanceof Packages.mindustry.world.blocks.production.GenericCrafter&&b.block.outputLiquids!=null){
                    for(var li=0;li<b.block.outputLiquids.length;li++)row.liquid_outputs.push({liquid:String(b.block.outputLiquids[li].liquid.name),direction:li<b.block.liquidOutputDirections.length?Number(b.block.liquidOutputDirections[li]):-1});
                }
                if(b.block instanceof Packages.mindustry.world.blocks.production.Pump){
                    row.liquid_role='source';var output=b.block instanceof Packages.mindustry.world.blocks.production.SolidPump?b.block.result:b.liquidDrop;
                    if(output!=null)row.liquid_outputs.push({liquid:String(output.name),direction:-1});
                }else if(row.liquid_inputs.length||row.liquid_outputs.length)row.liquid_role='facility';
            }

 if(b.block instanceof dist.ItemBridge)row.link_valid=Boolean(b.block.linkValid(b.tile,Vars.world.tile(b.link)));
 if(Array.isArray(row.link)){var target=Vars.world.build(row.link[0],row.link[1]);row.link_target_present=target!=null&&target.block==b.block&&target.team==b.team;}
 return row;
};
exports.get=function(k){var xy=k.split(','),b=Vars.world.build(Number(xy[0]),Number(xy[1]));return b!=null&&b.team==Vars.player.team()?b:null;};
exports.neighbors=function(row){
 var b=exports.get(row.x+','+row.y);if(b==null)return [];var found={},n=Number(b.block.size),o=-Math.floor((n-1)/2),x=Number(b.tile.x),y=Number(b.tile.y);
 function add(q){if(q!=null&&q!=b&&q.team==b.team)found[q.tile.x+','+q.tile.y]=true;}
 for(var i=o;i<o+n;i++){add(Vars.world.build(x+i,y+o-1));add(Vars.world.build(x+i,y+o+n));add(Vars.world.build(x+o-1,y+i));add(Vars.world.build(x+o+n,y+i));}
 var dist=Packages.mindustry.world.blocks.distribution;
 if(b.block instanceof dist.ItemBridge||b.block instanceof dist.DirectionBridge||b.block instanceof dist.MassDriver){
  var radius=Number(b.block.range)*(b.block instanceof dist.MassDriver?1:8);
  // Tile lookups see blueprint endpoints immediately, before spatial-index refresh.
  if(!(b.block instanceof dist.MassDriver)){for(var k=1;k<=Math.ceil(radius/8);k++)for(var d=0;d<4;d++){var dx=[1,0,-1,0][d]*k,dy=[0,1,0,-1][d]*k,q=Vars.world.build(x+dx,y+dy);if(q!=null&&q.block==b.block)add(q);}}
  else {var candidates=b.team.data().getBuildings(b.block);if(candidates!=null)candidates.each(function(q){var dx=q.x-b.x,dy=q.y-b.y;if(dx*dx+dy*dy<=radius*radius+.01)add(q);});}
  if(!(b.block instanceof dist.DirectionBridge)&&b.link>=0)add(Vars.world.build(b.link));
 }
 return Object.keys(found).sort();
};
exports.signature=function(k){var b=exports.get(k);if(b==null)return 'missing';var r=exports.row(b);return JSON.stringify(r)+'|'+exports.neighbors(r).join(';');};
exports.visible=function(rect){var out=[],tree=Vars.player.team().data().buildingTree;if(tree!=null)tree.intersect(rect[0],rect[1],rect[2],rect[3],cons(function(b){if(b.team==Vars.player.team())out.push(b);}));else{var seen={};for(var x=Math.max(0,Math.floor(rect[0]/8));x<Math.min(Vars.world.width(),Math.ceil((rect[0]+rect[2])/8));x++)for(var y=Math.max(0,Math.floor(rect[1]/8));y<Math.min(Vars.world.height(),Math.ceil((rect[1]+rect[3])/8));y++){var b=Vars.world.build(x,y);if(b!=null&&b.team==Vars.player.team()&&!seen[b.pos()]){seen[b.pos()]=true;out.push(b);}}}return out;};
exports.halo=function(){var names=['bridge-conveyor','phase-conveyor','bridge-conduit','phase-conduit','duct-bridge','reinforced-bridge-conduit','mass-driver'],r=2;names.forEach(function(n){var b=Vars.content.block(n);if(b!=null&&Vars.player.team().data().getBuildings(b).size>0)r=Math.max(r,Number(b.range)/(n==='mass-driver'?8:1)+2);});return r*8;};
exports.clear=function(){infoCache={};};
