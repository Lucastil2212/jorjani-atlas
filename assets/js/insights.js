'use strict';
(() => {
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt = value => new Intl.NumberFormat('en-US').format(value);
  const major = ['person','organization','place','work','concept','event','technology','group'];
  const labels = {person:'People',organization:'Organizations',place:'Places',work:'Works',concept:'Concepts',event:'Events',technology:'Technology',group:'Groups',other:'Other types'};
  const group = type => major.includes(type) ? type : 'other';
  let picks = new Map();
  let serial = 0;
  const pick = (name, ids) => {
    const key = 'insight-' + (++serial);
    picks.set(key,{title:name,claimIds:[...new Set(ids)]});
    return key;
  };
  function model({D,claims,entities}) {
    const entityIndex = new Map(D.entities.map(e => [e.id,e]));
    const matrix = new Map(), active = new Set(), relationClaims = new Set();
    let relationshipCount = 0;
    const dated = [], outside = [], decades = Array.from({length:24}, (_,i) => ({year:1800 + i*10, conversation:[],research:[]}));
    const dateIndex=new Map();let referenceCount=0;
    if(D.timeline_events)for(const event of D.timeline_events){if(!dateIndex.has(event.claim_id))dateIndex.set(event.claim_id,[]);dateIndex.get(event.claim_id).push(event);}
    const memberships = new Map(), sources = new Map(D.sources.map((s,i)=>[s.id,i]));
    for (const claim of claims) {
      for (const relation of claim.relations || []) {
        const a = entityIndex.get(relation.subject_id), b = entityIndex.get(relation.object_id);
        if (!a || !b) continue;
        const from = group(a.type), to = group(b.type), key = from+'|'+to;
        if (!matrix.has(key)) matrix.set(key,{from,to,count:0,claimIds:[]});
        const cell = matrix.get(key);cell.count++;cell.claimIds.push(claim.id);
        active.add(from);active.add(to);relationshipCount++;relationClaims.add(claim.id);
      }
      const dates=D.timeline_events?(dateIndex.get(claim.id)||[]):(claim.event_year!==null&&claim.event_year!==undefined&&Number.isFinite(+claim.event_year)?[{event_year:claim.event_year}]:[]);
      if(dates.length)dated.push(claim.id);
      for(const date of dates){
        referenceCount++;
        const index = Math.floor((+date.event_year-1800)/10);
        if(index>=0 && index<decades.length) decades[index][claim.evidence_layer==='external_research'?'research':'conversation'].push(claim.id);
        else outside.push(claim.id);
      }
      if (sources.has(claim.source_id)) for (const id of new Set(claim.entity_ids || [])) {
        if (!memberships.has(id)) memberships.set(id,{mask:0,claimIds:[]});
        const item = memberships.get(id);item.mask |= 1 << sources.get(claim.source_id);item.claimIds.push(claim.id);
      }
    }
    const overlap = [7,3,5,6,1,2,4].map(mask => ({mask,count:0,claimIds:[]}));
    for(const item of memberships.values()) {const row=overlap.find(r=>r.mask===item.mask);row.count++;row.claimIds.push(...item.claimIds);}
    return {matrix,types:[...major,'other'].filter(t=>active.has(t)),relationshipCount,relationClaims:[...relationClaims],dated,referenceCount,outside,decades,overlap,memberEntities:memberships.size,entities:entities.length};
  }
  function render(options) {
    picks = new Map();serial=0;
    const m=model(options), maxCell=Math.max(1,...[...m.matrix.values()].map(c=>c.count));
    const maxDecade=Math.max(1,...m.decades.map(d=>d.conversation.length+d.research.length));
    const maxOverlap=Math.max(1,...m.overlap.map(r=>r.count));
    const header='<div class="section-heading insight-section-heading"><div><div class="eyebrow">PATTERNS YOU CAN INSPECT</div><h2>Read the shape of the evidence.</h2></div><span class="pill">CLICK A CELL OR BAR TO OPEN ITS CLAIMS</span></div>';
    const matrix='<section class="panel insight-chart matrix-panel"><div class="panel-header"><div><h2>Who connects to what</h2><div class="panel-subtitle">Directed relationship records, grouped by entity type</div></div><div class="chart-total">'+fmt(m.relationshipCount)+'<small>relationships</small></div></div><div class="matrix-body">'+(m.types.length?'<div class="matrix-scroll"><div class="type-matrix" style="--matrix-cols:'+m.types.length+'"><div class="matrix-corner"><span>TO →</span><span>FROM ↓</span></div>'+m.types.map(t=>'<div class="matrix-column-label">'+labels[t]+'</div>').join('')+m.types.map(from=>'<div class="matrix-row-label"><i style="background:var(--node-'+(major.includes(from)?from:'other')+')"></i>'+labels[from]+'</div>'+m.types.map(to=>{
      const cell=m.matrix.get(from+'|'+to), count=cell?.count||0;
      const intensity=count?0.12+0.88*Math.sqrt(count/maxCell):0;
      const title=labels[from]+' → '+labels[to]+': '+fmt(count)+' relationship records'+(count?' in '+fmt(new Set(cell.claimIds).size)+' claims':'');
      return '<button class="matrix-cell '+(count?'':'zero')+'" style="--intensity:'+intensity.toFixed(3)+'" '+(count?'data-insight-key="'+pick(labels[from]+' → '+labels[to]+' relationships',cell.claimIds)+'"':'disabled')+' title="'+esc(title)+'" aria-label="'+esc(title)+'"><span>'+ (count?fmt(count):'·')+'</span></button>';
    }).join('')).join('')+'</div></div><div class="matrix-key"><span>Fewer records</span><span class="matrix-gradient"></span><span>More records</span><span class="matrix-range">0–'+fmt(maxCell)+'</span></div>':'<p class="note">No typed relationships in the selected scope.</p>')+'<p class="chart-explainer">Rows are subjects; columns are objects. Counts include each typed relationship record. “Other types” groups the remaining specialized categories. Color uses a square-root scale to keep smaller groups visible.</p></div></section>';
    const chronology='<section class="panel insight-chart chronology-panel"><div class="panel-header"><div><h2>When the account takes place</h2><div class="panel-subtitle">Dated references by decade · 1800–2039</div></div><div class="chart-total">'+fmt(m.referenceCount)+'<small>date references</small></div></div><div class="chronology-body"><div class="chart-legend"><span><i class="conversation-key"></i>Conversation</span><span><i class="research-key"></i>Documentary context</span></div><div class="chronology-plot"><div class="chart-y-label">'+fmt(maxDecade)+'</div><div class="chrono-grid-lines" aria-hidden="true"><i></i><i></i><i></i><i></i></div><div class="chrono-bars">'+m.decades.map(d=>{
      const a=d.conversation.length,b=d.research.length,total=a+b,name=d.year+'–'+(d.year+9)+': '+fmt(total)+' date references';
      return '<button class="chrono-bar" '+(total?'data-insight-key="'+pick('Dated '+d.year+'–'+(d.year+9),[...d.conversation,...d.research])+'"':'disabled')+' aria-label="'+esc(name)+'" title="'+esc(name+' ('+a+' conversation, '+b+' documentary)')+'"><span class="chrono-stack" style="height:'+(total/maxDecade*100).toFixed(3)+'%"><span class="chrono-research" style="height:'+(total?b/total*100:0)+'%"></span><span class="chrono-conversation" style="height:'+(total?a/total*100:0)+'%"></span></span><span class="chrono-tooltip">'+esc(name)+'</span></button>';
    }).join('')+'</div><div class="chart-zero">0</div></div><div class="chrono-axis"><span>1800</span><span>1850</span><span>1900</span><span>1950</span><span>2000</span><span>2030</span></div><div class="chronology-foot"><button class="text-button" '+(m.outside.length?'data-insight-key="'+pick('Dated claims outside 1800–2039',m.outside)+'"':'disabled')+'>'+fmt(m.outside.length)+' dates outside this window ↗</button><a class="text-button" href="#timeline">Open full timeline →</a></div><p class="chart-explainer">Each date reference counts once; a claim can supply more than one. Ranges use their start year. These are historical references within the account, separate from the interview recording dates.</p></div></section>';
    const overlap='<section class="panel insight-chart overlap-panel"><div class="panel-header"><div><h2>Threads across conversations</h2><div class="panel-subtitle">Exact combinations of appearances in the selected conversation records</div></div><div class="chart-total">'+fmt(m.memberEntities)+'<small>referenced entities</small></div></div><div class="overlap-body"><div class="overlap-labels"><span>CONVERSATIONS</span><span>ENTITIES IN THIS EXACT COMBINATION</span></div>'+m.overlap.map(row=>{
      const names=options.D.sources.filter((s,i)=>row.mask&(1<<i)).map(s=>s.short_title||s.title);
      return '<button class="overlap-row" '+(row.count?'data-insight-key="'+pick('Entities appearing in exactly '+names.join(' + '),row.claimIds)+'"':'disabled')+' title="'+esc(names.join(' + ')+': '+row.count+' entities; opens their associated claims')+'"><span class="overlap-membership">'+options.D.sources.map((s,i)=>'<span class="overlap-dot '+(row.mask&(1<<i)?'on':'')+'" aria-label="'+esc((s.short_title||s.title)+((row.mask&(1<<i))?' included':' absent'))+'">0'+(i+1)+'</span>').join('')+'</span><span class="overlap-track"><span style="width:'+(row.count/maxOverlap*100).toFixed(3)+'%"></span></span><strong>'+fmt(row.count)+'</strong></button>';
    }).join('')+'<p class="chart-explainer">Each entity appears in one row only. A shared entity is a recurring reference; it does not establish a shared operation or causal link. Clicking opens its associated claims in this scope.</p></div></section>';
    return header+'<div class="insights-grid">'+matrix+chronology+'</div>'+overlap;
  }
  document.addEventListener('click',event=>{
    const target=event.target.closest('[data-insight-key]');
    if(!target)return;
    const data=picks.get(target.dataset.insightKey);
    if(data)window.dispatchEvent(new CustomEvent('atlas-insight',{detail:data}));
  });
  window.AtlasInsights={render,model};
})();
