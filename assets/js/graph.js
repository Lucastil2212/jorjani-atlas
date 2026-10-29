/* Manticore graph renderer: exact directed-triple values, bounded layout, demand-driven canvas. */
'use strict';
(function(global){
  const pairKey=(a,b)=>a<b?JSON.stringify([a,b]):JSON.stringify([b,a]);
  const tripleKey=(a,p,b)=>JSON.stringify([a,p,b]);
  const hash=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;};
  const now=()=>global.performance?.now?.()||Date.now();
  const positionStores=new Map(),cameraStores=new Map();
  function add(map,key,value){let list=map.get(key);if(!list)map.set(key,list=[]);list.push(value);}
  function buildIndex({entities,claims,entityMap}){
    const started=now(),nodes=entities.slice(),nodeIds=new Set(nodes.map(e=>e.id)),all=entityMap||Object.fromEntries(nodes.map(e=>[e.id,e]));
    const rows=[],claimsByEntity=new Map(),names=new Map(),rowByEntity=new Map(),rowByPair=new Map();
    for(const c of claims){
      for(const id of new Set(c.entity_ids||[]))if(all[id])add(claimsByEntity,id,c);
      for(const r of c.relations||[]){if(!all[r.subject_id]||!all[r.object_id])continue;
        const row={...r,c,search:[all[r.subject_id].name,all[r.object_id].name,r.predicate,r.text,c.text,c.id].join(' ').toLowerCase()};rows.push(row);add(rowByEntity,r.subject_id,row);if(r.object_id!==r.subject_id)add(rowByEntity,r.object_id,row);add(rowByPair,pairKey(r.subject_id,r.object_id),row);
        for(const id of [r.subject_id,r.object_id])if(!nodeIds.has(id)){nodeIds.add(id);nodes.push(all[id]);}
      }
    }
    for(const e of nodes)for(const name of [e.id,e.name,...(e.aliases||[])]){const key=String(name).trim().toLowerCase();let ids=names.get(key);if(!ids)names.set(key,ids=new Set());ids.add(e.id);}
    const cache=new Map();
    function graph(kind='assertion'){
      if(cache.has(kind))return cache.get(kind);
      const start=now(),groups=new Map();
      function append(a,b,p,c,row){
        const id=kind==='assertion'?tripleKey(a,p,b):pairKey(a,b);let edge=groups.get(id);
        if(!edge){edge={id,a,b,predicate:kind==='assertion'?p:'shared_claim_appearance',directed:kind==='assertion',claimSet:new Set(),sourceSet:new Set(),layerSet:new Set(),rows:[],relationship_ids:[]};groups.set(id,edge);}
        edge.claimSet.add(c.id);if(c.source_id)edge.sourceSet.add(c.source_id);edge.layerSet.add(c.evidence_layer||'conversation');if(row){edge.rows.push(row);if(row.id)edge.relationship_ids.push(row.id);}
      }
      if(kind==='assertion')for(const r of rows)append(r.subject_id,r.object_id,r.predicate||'states',r.c,r);
      else for(const c of claims){const ids=[...new Set(c.entity_ids||[])].filter(id=>all[id]).sort();for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++)append(ids[i],ids[j],null,c,null);}
      const edges=[],pairs=new Map(),incident=new Map(),adjacency=new Map(),weightedDegree=new Map();
      for(const e of groups.values()){
        e.claim_ids=[...e.claimSet];e.source_ids=[...e.sourceSet];e.layers=[...e.layerSet];e.value=e.claim_ids.length;e.source_count=e.source_ids.length;e.record_count=e.rows.length;e.predicates=kind==='assertion'?[e.predicate]:[];delete e.claimSet;delete e.sourceSet;delete e.layerSet;edges.push(e);
        add(incident,e.a,e);if(e.b!==e.a)add(incident,e.b,e);
        const key=pairKey(e.a,e.b);let pair=pairs.get(key);if(!pair){const ids=[e.a,e.b].sort();pair={id:key,a:ids[0],b:ids[1],edges:[],claimSet:new Set(),sourceSet:new Set(),predicates:new Set(),layers:new Set()};pairs.set(key,pair);}
        pair.edges.push(e);for(const id of e.claim_ids)pair.claimSet.add(id);for(const id of e.source_ids)pair.sourceSet.add(id);for(const p of e.predicates)pair.predicates.add(p);for(const l of e.layers)pair.layers.add(l);
      }
      for(const p of pairs.values()){
        p.claim_ids=[...p.claimSet];p.source_ids=[...p.sourceSet];p.predicates=[...p.predicates];p.layers=[...p.layers];p.value=p.claim_ids.length;p.source_count=p.source_ids.length;delete p.claimSet;delete p.sourceSet;
        if(!adjacency.has(p.a))adjacency.set(p.a,new Map());if(!adjacency.has(p.b))adjacency.set(p.b,new Map());adjacency.get(p.a).set(p.b,p);adjacency.get(p.b).set(p.a,p);
        weightedDegree.set(p.a,(weightedDegree.get(p.a)||0)+p.value);if(p.a!==p.b)weightedDegree.set(p.b,(weightedDegree.get(p.b)||0)+p.value);
        p.edges.sort((a,b)=>a.id.localeCompare(b.id));p.edges.forEach((e,i)=>{e.lane=i-(p.edges.length-1)/2;e.parallel_count=p.edges.length;});
      }
      const ranked=nodes.slice().sort((a,b)=>(weightedDegree.get(b.id)||0)-(weightedDegree.get(a.id)||0)||(claimsByEntity.get(b.id)?.length||0)-(claimsByEntity.get(a.id)?.length||0)||a.name.localeCompare(b.name));
      const result={kind,edges,edgeById:new Map(edges.map(e=>[e.id,e])),pairs,incident,adjacency,weightedDegree,ranked,nodes,claimCount:claims.length,index_ms:now()-start};cache.set(kind,result);return result;
    }
    const index={nodes,claims,rows,claimsByEntity,rowByEntity,rowByPair,names,graph,build_ms:now()-started,resolve(value){const ids=names.get(String(value).trim().toLowerCase());return ids?.size===1?all[[...ids][0]]:null;}};
    return index;
  }
  function chooseGraph(index,kind,{limit=200,selected=null,depth=0,seeds=[],path=[]}={}){
    const g=index.graph(kind),allowed=depth&&selected?new Set([selected,...seeds]):null;
    if(allowed){let frontier=[...allowed];for(let d=0;d<depth;d++){const next=[];for(const id of frontier)for(const neighbor of g.adjacency.get(id)?.keys()||[])if(!allowed.has(neighbor)){allowed.add(neighbor);next.push(neighbor);}frontier=next;}}
    const candidates=allowed?g.ranked.filter(e=>allowed.has(e.id)):g.ranked;
    const candidateIds=new Set(candidates.map(e=>e.id)),required=new Set([...path,selected,...seeds].filter(id=>id&&candidateIds.has(id))),chosen=candidates.filter(e=>required.has(e.id));
    for(const e of candidates){if(chosen.length>=Math.max(limit,required.size))break;if(!required.has(e.id))chosen.push(e);}
    const ids=new Set(chosen.map(e=>e.id)),edges=g.edges.filter(e=>ids.has(e.a)&&ids.has(e.b));
    return {nodes:chosen.map(e=>({id:e.id,name:e.name,type:e.type,claim_count:index.claimsByEntity.get(e.id)?.length||0,degree:g.adjacency.get(e.id)?.size||0,weight:g.weightedDegree.get(e.id)||0})),edges,kind,matched_count:candidates.length,corpus_edges:g.edges.length,corpus_nodes:g.nodes.length};
  }
  /* A self-contained solver also runs in a Blob worker. It does not access the DOM. */
  function createLayoutSolver(input){
    const n=input.nodes.length,px=new Float64Array(n),py=new Float64Array(n),vx=new Float64Array(n),vy=new Float64Array(n),degree=new Float64Array(n),radii=new Float64Array(n),anchors=new Uint8Array(n),ax=new Float64Array(n),ay=new Float64Array(n);
    const edges=input.edges,adj=Array.from({length:n},()=>[]);let iteration=0;
    for(const e of edges){degree[e.a]++;degree[e.b]++;adj[e.a].push(e.b);adj[e.b].push(e.a);}
    const rank=Array.from({length:n},(_,i)=>i).sort((a,b)=>degree[b]-degree[a]||a-b),communities=new Int32Array(n).fill(-1),centers=[];
    for(const hub of rank){if(communities[hub]>=0||degree[hub]===0||centers.length>=24)continue;const group=centers.length;centers.push(hub);communities[hub]=group;for(const j of adj[hub])if(communities[j]<0)communities[j]=group;}
    for(let pass=0;pass<3;pass++)for(const i of rank){if(communities[i]>=0)continue;const scores=new Map();for(const j of adj[i])if(communities[j]>=0)scores.set(communities[j],(scores.get(communities[j])||0)+1);if(scores.size)communities[i]=[...scores].sort((a,b)=>b[1]-a[1]||a[0]-b[0])[0][0];}
    const groups=Math.max(1,centers.length),sizes=new Float64Array(groups+1),orders=new Float64Array(groups+1),cx=new Float64Array(groups+1),cy=new Float64Array(groups+1);
    for(let i=0;i<n;i++){if(communities[i]<0)communities[i]=groups;sizes[communities[i]]++;}
    const spread=Math.max(160,Math.sqrt(n)*13);
    for(let g=0;g<=groups;g++){const angle=g*2.399963,rad=Math.sqrt(g)*spread;cx[g]=Math.cos(angle)*rad;cy[g]=Math.sin(angle)*rad;}
    for(let i=0;i<n;i++){const node=input.nodes[i],group=communities[i],j=orders[group]++,angle=j*2.399963+(node.seed%360)/57.2958,rad=Math.sqrt(j)*28;px[i]=Number.isFinite(node.x)?node.x:cx[group]+Math.cos(angle)*rad;py[i]=Number.isFinite(node.y)?node.y:cy[group]+Math.sin(angle)*rad;radii[i]=node.r||5;anchors[i]=node.anchored?1:0;ax[i]=px[i];ay[i]=py[i];}
    const maxIterations=input.iterations||Math.min(150,90+Math.round(Math.sqrt(n))),theta2=.75*.75;
    function tree(){
      let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;for(let i=0;i<n;i++){minX=Math.min(minX,px[i]);minY=Math.min(minY,py[i]);maxX=Math.max(maxX,px[i]);maxY=Math.max(maxY,py[i]);}
      const side=Math.max(1,maxX-minX,maxY-minY)+2,cells=[{x:(minX+maxX)/2,y:(minY+maxY)/2,h:side/2,m:0,sx:0,sy:0,p:-1,c:null}];
      function insert(ci,i,depth){const c=cells[ci];c.m++;c.sx+=px[i];c.sy+=py[i];if(!c.c&&c.p<0){c.p=i;return;}if(depth>24)return;
        if(!c.c){const h=c.h/2;c.c=[];for(let q=0;q<4;q++){c.c.push(cells.length);cells.push({x:c.x+(q&1?h:-h),y:c.y+(q&2?h:-h),h,m:0,sx:0,sy:0,p:-1,c:null});}const old=c.p;c.p=-1;insert(c.c[(px[old]>=c.x?1:0)+(py[old]>=c.y?2:0)],old,depth+1);}
        insert(c.c[(px[i]>=c.x?1:0)+(py[i]>=c.y?2:0)],i,depth+1);
      }
      for(let i=0;i<n;i++)insert(0,i,0);return cells;
    }
    function step(){
      if(iteration>=maxIterations||!n)return false;const alpha=1-iteration/maxIterations,cells=tree(),charge=190*(.35+.65*alpha),stack=[];
      for(let i=0;i<n;i++){
        let fx=-px[i]*.0017,fy=-py[i]*.0017;stack.push(0);
        while(stack.length){const q=cells[stack.pop()];if(!q.m||q.p===i&&!q.c)continue;let dx=px[i]-q.sx/q.m,dy=py[i]-q.sy/q.m,d2=dx*dx+dy*dy;if(d2<.01){dx=(i%3-1)*.17||.1;dy=(i%5-2)*.13||-.1;d2=dx*dx+dy*dy;}
          const contains=Math.abs(px[i]-q.x)<=q.h&&Math.abs(py[i]-q.y)<=q.h;
          if(!q.c||!contains&&4*q.h*q.h<theta2*d2){const force=charge*q.m/Math.max(80,d2);fx+=dx*force;fy+=dy*force;}else for(const child of q.c)stack.push(child);
        }
        if(anchors[i]){fx+=(ax[i]-px[i])*.045;fy+=(ay[i]-py[i])*.045;}
        vx[i]+=fx;vy[i]+=fy;
      }
      for(const e of edges){const dx=px[e.b]-px[e.a],dy=py[e.b]-py[e.a],dist=Math.hypot(dx,dy)||1,ideal=78+Math.min(70,Math.sqrt(Math.max(degree[e.a],degree[e.b]))*4),strength=.045/Math.sqrt(Math.min(degree[e.a],degree[e.b])+1),force=(dist-ideal)*strength/dist;vx[e.a]+=dx*force;vy[e.a]+=dy*force;vx[e.b]-=dx*force;vy[e.b]-=dy*force;}
      const grid=new Map(),cellSize=40;
      for(let i=0;i<n;i++){const gx=Math.floor(px[i]/cellSize),gy=Math.floor(py[i]/cellSize);for(let x=gx-1;x<=gx+1;x++)for(let y=gy-1;y<=gy+1;y++){const list=grid.get(x+','+y);if(!list)continue;for(const j of list){const dx=px[i]-px[j],dy=py[i]-py[j],d=Math.hypot(dx,dy)||.01,gap=radii[i]+radii[j]+17;if(d<gap){const f=(gap-d)*.22/d;vx[i]+=dx*f;vy[i]+=dy*f;vx[j]-=dx*f;vy[j]-=dy*f;}}}const key=gx+','+gy;let bucket=grid.get(key);if(!bucket)grid.set(key,bucket=[]);bucket.push(i);}
      const maxStep=14*alpha+1;for(let i=0;i<n;i++){vx[i]*=.68;vy[i]*=.68;const speed=Math.hypot(vx[i],vy[i]),scale=Math.min(1,maxStep/(speed||1));px[i]+=vx[i]*scale;py[i]+=vy[i]*scale;}
      iteration++;return iteration<maxIterations;
    }
    return {step,positions(){const result=new Float32Array(n*2);for(let i=0;i<n;i++){result[i*2]=px[i];result[i*2+1]=py[i];}return result;},get iteration(){return iteration;},get done(){return iteration>=maxIterations||!n;},maxIterations};
  }
  function create(canvas,config={}){
    if(!canvas)return null;const ctx=canvas.getContext('2d');if(!ctx)return null;
    const started=now(),preview=!!config.preview,key=config.cacheKey||'default',positions=positionStores.get(key)||new Map();positionStores.set(key,positions);
    let dead=false,frame=0,layoutWorker=null,workerURL=null,layoutTimer=0,layoutGeneration=0,nodes=[],edges=[],nodeMap=new Map(),adj=new Map(),width=0,height=0,dpr=1,zoom=1,panX=0,panY=0,selected=config.selected||null,path=config.path||[],pathIds=new Set(path),pathPairs=new Set(),neighborIds=new Set(),hoverNode=null,hoverEdge=null,selectedEdge=null,drag=null,viewTouched=false,showValues=config.showValues!==false,palette={},layoutStatus='ready',drawCount=0,layoutStarted=0,lastDrawMs=0;
    let visibleNodes=[],visibleEdges=[],nodeHitGrid=new Map(),edgeHitGrid=new Map(),pointer=null,pointerDirty=false,themeKey='',model=null,fitPending=true;
    const savedCamera=cameraStores.get(key);if(savedCamera&&!preview){({zoom,panX,panY}=savedCamera);viewTouched=true;fitPending=false;}
    const listeners=[],docListeners=[];
    const on=(target,name,fn,opts)=>{target.addEventListener(name,fn,opts);listeners.push([target,name,fn,opts]);};
    const root=global.document?.documentElement;
    function theme(){const css=global.getComputedStyle(canvas),dark=root?.dataset.theme==='dark',value=(name,fallback)=>css.getPropertyValue(name).trim()||fallback;
      palette={bg:value('--graph-bg',dark?'#0e1920':'#f7faf5'),text:value('--graph-text',dark?'#d3e2dd':'#29463c'),muted:value('--muted',dark?'#9db0b8':'#6b7d72'),edge:value('--graph-edge',dark?'#628b9b':'#75988b'),research:value('--graph-research',dark?'#b3a276':'#9a814d'),selected:value('--graph-selected',dark?'#8bd6b4':'#277658'),path:value('--graph-path',dark?'#edd19b':'#b66a30'),label:value('--graph-label-bg',dark?'#10232b':'#ffffff'),grid:value('--graph-grid',dark?'#49606a':'#cddad1'),border:value('--graph-node-border',dark?'#122831':'#ffffff'),types:{}};
      const defaults=dark?{person:'#8cb6df',organization:'#d0b783',place:'#84c8b0',work:'#b6a0dc',concept:'#7fcbd0',event:'#d69d8d',technology:'#a7c78b',group:'#c3a3ba',other:'#a5b4c1'}:{person:'#487cbb',organization:'#b78b36',place:'#38876f',work:'#8c65b5',concept:'#358e9b',event:'#b96d54',technology:'#75934c',group:'#a36890',other:'#81928b'};
      for(const [type,fallback] of Object.entries(defaults))palette.types[type]=value('--node-'+type,fallback);themeKey=root?.dataset.theme||'light';invalidate();
    }
    const nodeColor=n=>palette.types[n.type]||palette.types.other;
    function metrics(){config.onMetrics?.({nodes:nodes.length,edges:edges.length,status:layoutStatus,layout_ms:layoutStarted?now()-layoutStarted:0,draw_ms:lastDrawMs,draws:drawCount,visible_nodes:visibleNodes.length,visible_edges:visibleEdges.length});}
    function invalidate(){if(!dead&&!frame)frame=global.requestAnimationFrame(paint);}
    function worldToScreen(n){return {x:width/2+panX+n.x*zoom,y:height/2+panY+n.y*zoom};}
    function radius(n){return Math.max(preview?2.5:3,Math.min(preview?10:17,n.r*Math.sqrt(zoom)));}
    function updateFocus(){pathIds=new Set(path);pathPairs=new Set(path.slice(1).map((id,i)=>pairKey(path[i],id)));neighborIds=new Set(selected?[selected,...(adj.get(selected)||[])]:[]);}
    function stopLayout(){layoutGeneration++;if(layoutWorker){layoutWorker.terminate();layoutWorker=null;}if(workerURL){global.URL.revokeObjectURL(workerURL);workerURL=null;}global.clearTimeout(layoutTimer);layoutTimer=0;}
    function remember(){for(const n of nodes)positions.set(n.id,{x:n.x,y:n.y});}
    function acceptLayout(coords,generation,done,iteration){if(dead||generation!==layoutGeneration)return;for(let i=0;i<nodes.length;i++){nodes[i].x=coords[i*2];nodes[i].y=coords[i*2+1];}if(!viewTouched)fit(false);if(done){layoutStatus='settled';remember();}else layoutStatus='arranging';invalidate();if(done||iteration===0)metrics();}
    function startLayout(){stopLayout();if(!nodes.length){layoutStatus='empty';metrics();return;}const generation=layoutGeneration;layoutStarted=now();layoutStatus='arranging';
      const physical=new Map();for(const e of edges)if(e.a!==e.b){const k=pairKey(e.a,e.b);if(!physical.has(k))physical.set(k,{a:e.s.i,b:e.t.i,value:e.value});}
      const reused=nodes.filter(n=>n.reused).length,iterations=reused===nodes.length?24:preview?72:Math.min(145,90+Math.round(Math.sqrt(nodes.length)));
      const input={nodes:nodes.map(n=>({x:n.x,y:n.y,seed:hash(n.id),r:n.r,anchored:n.reused&&viewTouched})),edges:[...physical.values()],iterations};
      function fallback(){if(dead||generation!==layoutGeneration)return;const solver=createLayoutSolver(input);acceptLayout(solver.positions(),generation,false,0);function tick(){if(dead||generation!==layoutGeneration)return;const deadline=now()+6;do{solver.step();}while(!solver.done&&now()<deadline);acceptLayout(solver.positions(),generation,solver.done,solver.iteration);if(!solver.done)layoutTimer=global.setTimeout(tick,12);}layoutTimer=global.setTimeout(tick,0);}
      if(typeof global.Worker==='function'&&global.Blob&&global.URL?.createObjectURL){try{
        const script=`const createLayoutSolver=${createLayoutSolver.toString()};let cancelled=false;onmessage=e=>{const solver=createLayoutSolver(e.data);const first=solver.positions();postMessage({positions:first,done:false,iteration:0},[first.buffer]);function tick(){const end=performance.now()+12;do{solver.step();}while(!solver.done&&performance.now()<end);const positions=solver.positions();postMessage({positions,done:solver.done,iteration:solver.iteration},[positions.buffer]);if(!solver.done)setTimeout(tick,12);}tick();};`;
        workerURL=global.URL.createObjectURL(new global.Blob([script],{type:'application/javascript'}));layoutWorker=new global.Worker(workerURL);layoutWorker.onmessage=ev=>{if(dead||generation!==layoutGeneration)return;const m=ev.data;acceptLayout(m.positions,generation,m.done,m.iteration);if(m.done){layoutWorker?.terminate();layoutWorker=null;if(workerURL){global.URL.revokeObjectURL(workerURL);workerURL=null;}}};layoutWorker.onerror=()=>{if(dead||generation!==layoutGeneration)return;layoutWorker?.terminate();layoutWorker=null;if(workerURL){global.URL.revokeObjectURL(workerURL);workerURL=null;}fallback();};layoutWorker.postMessage(input);
      }catch{fallback();}}else fallback();metrics();
    }
    function setData(data,{preserveView=true,fitView=false}={}){
      remember();model=data;const oldIds=new Set(nodes.map(n=>n.id));nodes=data.nodes.map((e,i)=>{const saved=positions.get(e.id);return {...e,i,x:saved?.x,y:saved?.y,reused:!!saved,r:Math.min(preview?9:13,3.6+Math.sqrt(e.claim_count||1)*.53)};});nodeMap=new Map(nodes.map(n=>[n.id,n]));edges=data.edges.filter(e=>nodeMap.has(e.a)&&nodeMap.has(e.b)).map(e=>({...e,s:nodeMap.get(e.a),t:nodeMap.get(e.b)}));adj=new Map();for(const e of edges){if(!adj.has(e.a))adj.set(e.a,new Set());if(!adj.has(e.b))adj.set(e.b,new Set());adj.get(e.a).add(e.b);adj.get(e.b).add(e.a);}updateFocus();
      hoverNode=null;hoverEdge=null;if(!edges.some(e=>e.id===selectedEdge))selectedEdge=null;
      if(!preserveView||fitView){viewTouched=false;fitPending=true;}
      const same=nodes.length===oldIds.size&&nodes.every(n=>oldIds.has(n.id));
      if(same&&nodes.every(n=>Number.isFinite(n.x))){stopLayout();layoutStatus='settled';if(fitView||fitPending)fit(false);invalidate();metrics();}
      else{const initial=createLayoutSolver({nodes:nodes.map(n=>({x:n.x,y:n.y,r:n.r,seed:hash(n.id)})),edges:edges.map(e=>({a:e.s.i,b:e.t.i})),iterations:1}).positions();for(let i=0;i<nodes.length;i++){nodes[i].x=initial[i*2];nodes[i].y=initial[i*2+1];}if(fitPending)fit(false);invalidate();startLayout();}
      return api;
    }
    function fit(touch=true,ids=null){if(!width||!height||!nodes.length)return;const target=ids?.length?ids.map(id=>nodeMap.get(id)).filter(Boolean):path.length>1?path.map(id=>nodeMap.get(id)).filter(Boolean):nodes;if(!target.length)return;let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;for(const n of target){if(!Number.isFinite(n.x))continue;minX=Math.min(minX,n.x-n.r);maxX=Math.max(maxX,n.x+n.r);minY=Math.min(minY,n.y-n.r);maxY=Math.max(maxY,n.y+n.r);}const pad=preview?34:65;zoom=Math.max(.04,Math.min(4,(width-pad*2)/Math.max(140,maxX-minX),(height-pad*2)/Math.max(120,maxY-minY)));panX=-(minX+maxX)*zoom/2;panY=-(minY+maxY)*zoom/2;fitPending=false;if(touch)viewTouched=true;invalidate();}
    function resize(){if(dead)return;const r=canvas.getBoundingClientRect();width=Math.max(1,r.width);height=Math.max(1,r.height);dpr=Math.min(global.devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);if(!viewTouched)fit(false);invalidate();}
    const cellKey=(x,y)=>Math.floor(x/64)+','+Math.floor(y/64);
    function gridAdd(grid,x,y,value){const key=cellKey(x,y);let items=grid.get(key);if(!items)grid.set(key,items=[]);items.push(value);}
    function curvePoint(g,t){const u=1-t;return {x:u*u*g.ax+2*u*t*g.cx+t*t*g.bx,y:u*u*g.ay+2*u*t*g.cy+t*t*g.by};}
    function paint(){
      frame=0;if(dead)return;const drawStart=now();ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);ctx.fillStyle=palette.bg;ctx.fillRect(0,0,width,height);
      if(!nodes.length){ctx.fillStyle=palette.muted;ctx.font='13px sans-serif';ctx.textAlign='center';ctx.fillText('No connected entities in this selection.',width/2,height/2);metrics();return;}
      ctx.fillStyle=palette.grid;ctx.globalAlpha=.38;const gridStep=42,offsetX=((width/2+panX)%gridStep+gridStep)%gridStep,offsetY=((height/2+panY)%gridStep+gridStep)%gridStep;for(let x=offsetX;x<width;x+=gridStep)for(let y=offsetY;y<height;y+=gridStep)ctx.fillRect(x,y,1,1);ctx.globalAlpha=1;
      visibleNodes=[];visibleEdges=[];nodeHitGrid=new Map();edgeHitGrid=new Map();let maxNodePadding=0;
      for(const n of nodes){const p=worldToScreen(n);n.sx=p.x;n.sy=p.y;n.sr=radius(n);if(p.x+n.sr+5>=0&&p.x-n.sr-5<=width&&p.y+n.sr+5>=0&&p.y-n.sr-5<=height){visibleNodes.push(n);gridAdd(nodeHitGrid,p.x,p.y,n);maxNodePadding=Math.max(maxNodePadding,n.sr+2);}}
      const focus=selected||hoverNode,focusedNeighbors=hoverNode&&!selected?new Set([hoverNode,...(adj.get(hoverNode)||[])]):neighborIds;
      for(const e of edges){const a=e.s,b=e.t,lane=e.lane||0,dx=b.sx-a.sx,dy=b.sy-a.sy,dist=Math.hypot(dx,dy)||1,sign=e.a<e.b?1:-1,offset=lane*15*Math.min(2,Math.sqrt(zoom));const cx=(a.sx+b.sx)/2-dy/dist*offset*sign,cy=(a.sy+b.sy)/2+dx/dist*offset*sign;
        const margin=25+Math.abs(offset);if(Math.max(a.sx,b.sx,cx)<-margin||Math.min(a.sx,b.sx,cx)>width+margin||Math.max(a.sy,b.sy,cy)<-margin||Math.min(a.sy,b.sy,cy)>height+margin)continue;
        const near=focus&&(e.a===focus||e.b===focus),onPath=pathPairs.has(pairKey(e.a,e.b)),active=e.id===selectedEdge||e.id===hoverEdge;
        const startDX=cx-a.sx,startDY=cy-a.sy,startD=Math.hypot(startDX,startDY)||1,endDX=b.sx-cx,endDY=b.sy-cy,endD=Math.hypot(endDX,endDY)||1;
        const g={edge:e,ax:a.sx+startDX/startD*(a.sr+2),ay:a.sy+startDY/startD*(a.sr+2),bx:b.sx-endDX/endD*(b.sr+3),by:b.sy-endDY/endD*(b.sr+3),cx,cy,near,onPath,active};visibleEdges.push(g);
      }
      visibleEdges.sort((a,b)=>(a.active?8:a.onPath?4:a.near?2:0)-(b.active?8:b.onPath?4:b.near?2:0));
      for(const g of visibleEdges){const e=g.edge,research=e.layers?.length===1&&e.layers[0]==='external_research';ctx.strokeStyle=g.onPath?palette.path:g.active||g.near?palette.selected:research?palette.research:palette.edge;ctx.globalAlpha=g.active?1:g.onPath?.95:g.near?.8:focus?.065:edges.length>2500?.16:.26;ctx.lineWidth=(g.active?2.3:g.onPath?2.1:g.near?1.25:.65)+Math.min(2.6,Math.log2(e.value||1)*.55);ctx.setLineDash(research?[5,4]:[]);ctx.beginPath();ctx.moveTo(g.ax,g.ay);ctx.quadraticCurveTo(g.cx,g.cy,g.bx,g.by);ctx.stroke();
        if(e.directed&&(g.active||g.onPath||g.near||zoom>.65||edges.length<300)){const dx=g.bx-g.cx,dy=g.by-g.cy,angle=Math.atan2(dy,dx),size=g.active||g.near?6:4;ctx.setLineDash([]);ctx.fillStyle=ctx.strokeStyle;ctx.beginPath();ctx.moveTo(g.bx,g.by);ctx.lineTo(g.bx-Math.cos(angle-.46)*size,g.by-Math.sin(angle-.46)*size);ctx.lineTo(g.bx-Math.cos(angle+.46)*size,g.by-Math.sin(angle+.46)*size);ctx.closePath();ctx.fill();}
        const cells=new Set(),steps=Math.min(42,Math.max(4,Math.ceil(Math.hypot(g.bx-g.ax,g.by-g.ay)/38)));for(let s=0;s<=steps;s++){const p=curvePoint(g,s/steps);if(p.x<-64||p.x>width+64||p.y<-64||p.y>height+64)continue;const key=cellKey(p.x,p.y);if(!cells.has(key)){cells.add(key);gridAdd(edgeHitGrid,p.x,p.y,g);}}
      }
      ctx.setLineDash([]);ctx.globalAlpha=1;
      for(let i=visibleNodes.length-1;i>=0;i--){const n=visibleNodes[i],active=n.id===selected||n.id===hoverNode,onPath=pathIds.has(n.id),faded=focus&&!focusedNeighbors.has(n.id)&&!onPath;ctx.globalAlpha=faded?.22:1;
        if(active||onPath){ctx.beginPath();ctx.arc(n.sx,n.sy,n.sr+7,0,Math.PI*2);ctx.fillStyle=onPath?palette.path:palette.selected;ctx.globalAlpha=faded?.1:.12;ctx.fill();ctx.globalAlpha=1;ctx.beginPath();ctx.arc(n.sx,n.sy,n.sr+4,0,Math.PI*2);ctx.strokeStyle=onPath?palette.path:palette.selected;ctx.lineWidth=1.4;ctx.stroke();}
        ctx.beginPath();ctx.arc(n.sx,n.sy,n.sr,0,Math.PI*2);ctx.fillStyle=nodeColor(n);ctx.fill();ctx.lineWidth=active?2:1;ctx.strokeStyle=palette.border;ctx.stroke();
      }
      ctx.globalAlpha=1;
      const occupied=new Map(),overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
      function collides(box,save=false){const minX=Math.floor(box.x/64),maxX=Math.floor((box.x+box.w)/64),minY=Math.floor(box.y/64),maxY=Math.floor((box.y+box.h)/64),seen=save?null:new Set();for(let x=minX;x<=maxX;x++)for(let y=minY;y<=maxY;y++){const key=x+','+y;if(save){let list=occupied.get(key);if(!list)occupied.set(key,list=[]);list.push(box);}else for(const b of occupied.get(key)||[])if(!seen.has(b)){seen.add(b);if(overlap(box,b))return true;}}return false;}
      // Node centers occupy one grid cell each. Only centers within the largest visible radius can overlap a label.
      function collidesWithNode(box,id){const right=box.x+box.w,bottom=box.y+box.h,minX=Math.floor((box.x-maxNodePadding)/64),maxX=Math.floor((right+maxNodePadding)/64),minY=Math.floor((box.y-maxNodePadding)/64),maxY=Math.floor((bottom+maxNodePadding)/64);for(let x=minX;x<=maxX;x++)for(let y=minY;y<=maxY;y++)for(const n of nodeHitGrid.get(x+','+y)||[]){if(n.id===id)continue;const nx=n.sx-n.sr-2,ny=n.sy-n.sr-2,size=n.sr*2+4;if(box.x<nx+size&&right>nx&&box.y<ny+size&&bottom>ny)return true;}return false;}
      const prioritized=visibleNodes.filter(n=>n.id===selected||n.id===hoverNode||pathIds.has(n.id)||focusedNeighbors.has(n.id)||!focus).sort((a,b)=>((b.id===hoverNode?1e8:0)+(b.id===selected?9e7:0)+(pathIds.has(b.id)?8e7:0)+(focusedNeighbors.has(b.id)?1e6:0)+b.weight)-((a.id===hoverNode?1e8:0)+(a.id===selected?9e7:0)+(pathIds.has(a.id)?8e7:0)+(focusedNeighbors.has(a.id)?1e6:0)+a.weight));
      const nodeBudget=preview?18:Math.min(100,24+Math.round(zoom*25)+(focus?20:0));let count=0;
      for(const n of prioritized){const important=n.id===selected||n.id===hoverNode||pathIds.has(n.id);if(!important&&count>=nodeBudget)break;const size=important?12:preview?9.5:10.5;ctx.font=`${important?'600':'400'} ${size}px "DM Sans",sans-serif`;let label=n.name.length>(important?52:34)?n.name.slice(0,important?51:33)+'…':n.name;const w=ctx.measureText(label).width+10,h=size+7,gap=n.sr+5;const slots=[{x:n.sx+gap,y:n.sy-h/2,w,h},{x:n.sx-w-gap,y:n.sy-h/2,w,h},{x:n.sx-w/2,y:n.sy+gap,w,h},{x:n.sx-w/2,y:n.sy-h-gap,w,h}];let box=slots.find(b=>b.x>4&&b.y>4&&b.x+b.w<width-4&&b.y+b.h<height-(preview?4:28)&&!collides(b)&&!collidesWithNode(b,n.id));if(!box&&important)box={...slots[0],x:Math.max(4,Math.min(width-w-4,slots[0].x)),y:Math.max(4,Math.min(height-h-28,slots[0].y))};if(!box)continue;collides(box,true);ctx.globalAlpha=.94;ctx.fillStyle=palette.label;ctx.fillRect(box.x,box.y,box.w,box.h);ctx.globalAlpha=1;ctx.fillStyle=important?palette.text:palette.muted;ctx.textAlign='left';ctx.textBaseline='top';ctx.fillText(label,box.x+5,box.y+3);count++;}
      if(showValues&&!preview){const candidates=visibleEdges.filter(g=>g.active||g.onPath||g.near||zoom>1.15||!focus&&g.edge.value>1).sort((a,b)=>(b.active?1e8:b.onPath?1e7:b.near?1e6:0)+b.edge.value-((a.active?1e8:a.onPath?1e7:a.near?1e6:0)+a.edge.value));let count=0;for(const g of candidates){if(count>=((selected||hoverNode)?24:zoom>1.15?25:10)&&!g.active)continue;const e=g.edge,p=curvePoint(g,.5),full=g.active||g.onPath||g.near||zoom>1.8,label=full?(e.directed?e.predicate.replaceAll('_',' '):'shared claims')+' · '+e.value:String(e.value);ctx.font='500 10px "DM Sans",sans-serif';const trimmed=label.length>43?label.slice(0,40)+'…':label,w=ctx.measureText(trimmed).width+12,h=18,box={x:p.x-w/2,y:p.y-h/2,w,h};if(box.x<4||box.x+w>width-4||box.y<4||box.y+h>height-28||collides(box)&&!g.active)continue;collides(box,true);ctx.fillStyle=palette.label;ctx.globalAlpha=.97;ctx.fillRect(box.x,box.y,w,h);ctx.globalAlpha=1;ctx.strokeStyle=g.onPath?palette.path:palette.selected;ctx.lineWidth=.6;ctx.strokeRect(box.x,box.y,w,h);ctx.fillStyle=g.onPath?palette.path:palette.text;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(trimmed,p.x,p.y+.3);count++;}}
      if(pointerDirty&&pointer&&!drag){pointerDirty=false;updateHover(pointer);}
      drawCount++;lastDrawMs=now()-drawStart;config.onDraw?.({draws:drawCount,ms:lastDrawMs,visible_nodes:visibleNodes.length,visible_edges:visibleEdges.length});
    }
    function coords(ev){const r=canvas.getBoundingClientRect();return {x:ev.clientX-r.left,y:ev.clientY-r.top};}
    function candidates(grid,p){const result=new Set(),x=Math.floor(p.x/64),y=Math.floor(p.y/64);for(let a=x-1;a<=x+1;a++)for(let b=y-1;b<=y+1;b++)for(const item of grid.get(a+','+b)||[])result.add(item);return result;}
    function hitNode(p){let best=null,distance=Infinity;for(const n of candidates(nodeHitGrid,p)){const d=Math.hypot(n.sx-p.x,n.sy-p.y);if(d<n.sr+7&&d<distance){best=n;distance=d;}}return best;}
    function hitEdge(p){let best=null,bestD=7;for(const g of candidates(edgeHitGrid,p)){let prev=curvePoint(g,0);for(let i=1;i<=10;i++){const next=curvePoint(g,i/10),dx=next.x-prev.x,dy=next.y-prev.y,t=Math.max(0,Math.min(1,((p.x-prev.x)*dx+(p.y-prev.y)*dy)/(dx*dx+dy*dy||1))),d=Math.hypot(p.x-prev.x-t*dx,p.y-prev.y-t*dy);if(d<bestD){bestD=d;best=g.edge;}prev=next;}}return best;}
    function updateHover(p){const n=hitNode(p),e=n?null:hitEdge(p),changed=hoverNode!==(n?.id||null)||hoverEdge!==(e?.id||null);hoverNode=n?.id||null;hoverEdge=e?.id||null;canvas.style.cursor=n||e?'pointer':preview?'default':'grab';config.onHover?.(n?{kind:'node',node:n,position:p}:e?{kind:'edge',edge:e,position:p}:null);if(changed)invalidate();}
    function setZoom(factor,point={x:width/2,y:height/2}){const old=zoom;zoom=Math.max(.035,Math.min(8,zoom*factor));panX=point.x-width/2-(point.x-width/2-panX)*(zoom/old);panY=point.y-height/2-(point.y-height/2-panY)*(zoom/old);viewTouched=true;invalidate();}
    function focusNode(id,{center=false}={}){selected=id;updateFocus();if(center){const n=nodeMap.get(id);if(n){panX=-n.x*zoom;panY=-n.y*zoom;viewTouched=true;}}invalidate();}
    on(canvas,'wheel',ev=>{if(preview)return;ev.preventDefault();setZoom(Math.exp(-Math.max(-120,Math.min(120,ev.deltaY))*.0018),coords(ev));},{passive:false});
    on(canvas,'pointerdown',ev=>{const p=coords(ev),n=hitNode(p);drag={x:p.x,y:p.y,px:panX,py:panY,moved:false,node:n,edge:n?null:hitEdge(p)};if(!preview)canvas.setPointerCapture?.(ev.pointerId);});
    on(canvas,'pointermove',ev=>{const p=coords(ev);if(drag&&!preview){const dx=p.x-drag.x,dy=p.y-drag.y;if(Math.abs(dx)+Math.abs(dy)>4)drag.moved=true;if(drag.moved){viewTouched=true;panX=drag.px+dx;panY=drag.py+dy;canvas.style.cursor='grabbing';config.onHover?.(null);invalidate();}return;}pointer=p;pointerDirty=true;invalidate();});
    on(canvas,'pointerup',ev=>{const action=drag;drag=null;canvas.releasePointerCapture?.(ev.pointerId);if(action&&!action.moved){if(action.node)config.onSelectNode?.(action.node.id);else if(action.edge&&!preview){selectedEdge=action.edge.id;config.onSelectEdge?.(action.edge);invalidate();}}});
    on(canvas,'pointercancel',()=>{drag=null;});on(canvas,'pointerleave',()=>{if(drag)return;hoverNode=null;hoverEdge=null;pointer=null;config.onHover?.(null);invalidate();});
    on(canvas,'keydown',ev=>{if(preview)return;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','0','Enter'].includes(ev.key)){ev.preventDefault();if(ev.key==='+'||ev.key==='=')setZoom(1.2);else if(ev.key==='-')setZoom(.8);else if(ev.key==='0')fit();else if(ev.key==='Enter'&&selected)config.onOpenNode?.(selected);else{panX+=ev.key==='ArrowLeft'?45:ev.key==='ArrowRight'?-45:0;panY+=ev.key==='ArrowUp'?45:ev.key==='ArrowDown'?-45:0;viewTouched=true;invalidate();}}});
    on(global,'atlas-theme-change',theme);
    const observer=new global.ResizeObserver(resize);observer.observe(canvas);
    const api={setData,setFocus(id,pathValue=path){selected=id;path=pathValue;updateFocus();invalidate();},setPath(value){path=value;updateFocus();invalidate();},setValues(value){showValues=value;invalidate();},center(id){focusNode(id,{center:true});},ensureVisible(id){const n=nodeMap.get(id);if(n){const p=worldToScreen(n);if(p.x<45||p.x>width-45||p.y<45||p.y>height-45)focusNode(id,{center:true});}},draw:invalidate,fit:()=>fit(true),fitIds:ids=>fit(true,ids),zoom:setZoom,refreshTheme:theme,getState:()=>({zoom,panX,panY}),stats:()=>({nodes:nodes.length,edges:edges.length,draws:drawCount,status:layoutStatus,draw_ms:lastDrawMs,elapsed_ms:now()-started,worker:!!layoutWorker}),destroy(){if(dead)return;remember();if(!preview)cameraStores.set(key,{zoom,panX,panY});dead=true;stopLayout();observer.disconnect();if(frame)global.cancelAnimationFrame(frame);listeners.forEach(([target,name,fn,opts])=>target.removeEventListener(name,fn,opts));config.onHover?.(null);}};
    theme();resize();if(config.data)setData(config.data,{preserveView:!!savedCamera});return api;
  }
  global.AtlasGraph={buildIndex,chooseGraph,create,createLayoutSolver,pairKey,tripleKey};
})(typeof window!=='undefined'?window:globalThis);
