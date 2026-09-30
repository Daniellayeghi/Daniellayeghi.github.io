import {componentLayout, processLayout, edgePath, NODE_W, NODE_H} from './graph.js';

const $ = id => document.getElementById(id);
const apiBase = document.querySelector('meta[name="xf-api-base"]')?.content || location.origin;
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const human = v => String(v ?? '').replaceAll('_', ' ');
const safeURL = value => {try {const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : null;} catch {return null;}};
const aliases = {RACK:'Lenovo NVIDIA GB300 NVL72',R01:'GB300 compute tray',R02:'NVLink switch tray',R03:'33 kW power shelf',R04:'Management switch',R05:'Cable cartridge',R06:'DC busbar',R07:'Supply manifold',R08:'Return manifold',R09:'1.5 m power whip',R10:'3.5 m power whip',R11:'Leakage drip pan','L2-019':'5.5 kW power converter','L2-020':'Power management controller'};
const short = n => aliases[n.id] || n.name;
const scopeAliases = {'A-R02':'FSP · converter production, 2015–2016','B-R02':'FSP · additional 2015 observations','A-R03':'Keysun · wound transformers','A-R04':'PULS · burn-in','A-R05':'Delta · dispensing preparation','A-R06':'XP Power · traceability and testing','A-R07':'SANYO DENKI · production controls','B-R04':'Infineon · planar magnetics construction','C-R02':'Seasonic · historical production comparison','C-R04':'Delta · line planning and vision','C-R05':'MEAN WELL · regenerative burn-in'};
const studyIncludes = (study, componentId) => study.component_id === componentId || study.component_ids?.includes(componentId);
let data, nodes, study = null, scope = null, layout, selectedOp = null, renderVersion = 0, detailTab = 'overview';
let state = {component:'RACK',view:'components',scope:null,step:null}, camera = {x:0,y:0,k:1};
const cameraCache = new Map(), studyCache = new Map(), processChoices = new Map();
let navigationCount = 0, drag = null, moved = false;
const pointers = new Map(); let pinch = null;
const canvas = $('canvas'), world = $('world');

function stringify(v) {
  if (v === null || v === undefined || v === '') return '<span class="subtle">Not recorded</span>';
  if (Array.isArray(v)) return v.length ? '<ul class="field-list">'+v.map(x=>'<li>'+stringify(x)+'</li>').join('')+'</ul>' : '<span class="subtle">Not recorded</span>';
  if (typeof v === 'object') return Object.entries(v).filter(([k])=>!['gap_ids','evidence_ids','source_ids','role_evidence_ids'].includes(k)).map(([k,x])=>'<p><span class="subtle">'+esc(human(k))+': </span>'+stringify(x)+'</p>').join('');
  return esc(v);
}
function field(label,value) {return '<section class="field"><span class="field-label">'+esc(label)+'</span>'+stringify(value)+'</section>';}
function companyDetails(value) {
  if(!value||typeof value!=='object')return field('Companies and roles',value);
  const summary={};
  for(const key of ['brand_or_designer','component_brand_owner','brand_or_integrator','component_designer','manufacturer','actual_manufacturer','rack_integrator','supplier']) {
    if(value[key])summary[human(key)]=value[key];
  }
  if(!Object.keys(summary).length)return field('Companies and roles',value);
  return field('Companies and roles',summary)+'<details><summary>Company attribution and evidence limits</summary>'+stringify(value)+'</details>';
}
function badge(n) {
  if (n.kind==='boundary') return 'Outside boundary';
  if (n.detail_state) return n.detail_state==='evidence_gap'?'Method unresolved':n.kind==='reference'?'Reference operation':'Conditional operation';
  if (['reconstructed','reconstruction'].includes(n.status)) return 'Inferred component';
  if (n.status==='documented_class_with_reconstructed_technical_role') return 'Class documented · role inferred';
  return n.boundary==='evidence_gap'?'Detail unresolved':'Documented component';
}
function stateKey(s=state) {return [s.component,s.view,s.scope||''].join('|');}
function href(changes) {const next={...state,...changes}; const p=new URLSearchParams(); for(const key of ['component','view','scope','step'])if(next[key])p.set(key,next[key]);return '#'+p.toString();}
function navigate(changes) {
  cameraCache.set(stateKey(),{...camera});
  if(changes.view==='manufacturing'&&!changes.scope&&processChoices.has(changes.component||state.component)) {
    changes={...changes,...processChoices.get(changes.component||state.component)};
  }
  const hash=href(changes);if(hash===location.hash){renderInspector();return;}
  location.hash=hash; navigationCount++;
}
function pathTo(id, seen=new Set()) {
  if (id===data.root||seen.has(id))return [{id:data.root}]; seen.add(id);
  const edge=data.edges.find(e=>e.to===id&&e.type==='contains')||data.edges.find(e=>e.to===id);
  return edge?[...pathTo(edge.from,seen),{id,uncertain:edge.type==='unresolved'}]:[{id:data.root},{id,uncertain:true}];
}
function announce(message) {$('announcer').textContent=message;}
async function fetchJSON(path) {const r=await fetch(new URL(path,apiBase),{credentials:'omit'});if(!r.ok)throw new Error('Unable to load saved research ('+r.status+').');return r.json();}

async function renderFromURL() {
  const version=++renderVersion, p=new URLSearchParams(location.hash.slice(1));
  const previous=state;
  state={component:nodes.has(p.get('component'))?p.get('component'):data.root,view:p.get('view')==='manufacturing'?'manufacturing':'components',scope:p.get('scope'),step:p.get('step')};
  if(previous.component!==state.component||previous.view!==state.view)detailTab='overview';
  const n=nodes.get(state.component);study=null;scope=null;selectedOp=null;
  $('selection-id').textContent=n.id+' / '+(state.view==='components'?'Product structure':'Manufacturing process');
  $('selection-title').textContent=short(n);
  $('breadcrumbs').innerHTML=pathTo(n.id).map((v,i)=>(i?'<span aria-label="'+(v.uncertain?'Intermediate parent unresolved':'contains')+'">'+(v.uncertain?'⋯':'/')+'</span>':'')+'<a href="'+esc(href({component:v.id,view:'components',scope:null,step:null}))+'"'+(v.id===n.id?' aria-current="page"':'')+'>'+esc(short(nodes.get(v.id)))+'</a>').join('');
  document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===state.view)));
  $('back').disabled=navigationCount===0;
  $('route-bar').hidden=true; $('empty-state').hidden=true;
  $('search-results').hidden=true;$('search').value='';$('search').setAttribute('aria-expanded','false');
  if(state.view==='manufacturing') {
    const entry=data.studies.find(s=>studyIncludes(s,n.id));
    if(entry) {
      $('inspector').innerHTML='<div class="loading">Loading the manufacturing study…</div>';
      if(!studyCache.has(entry.id)) {
        try {const result=await fetchJSON('/api/study/'+encodeURIComponent(entry.id));studyCache.set(entry.id,result);}catch(error){if(version===renderVersion)showError(error);return;}
      }
      if(version!==renderVersion)return;
      study=studyCache.get(entry.id);
      scope=study.scopes.find(r=>r.id===state.scope)||study.scopes[0];state.scope=scope.id;
      const operations=study.operations.filter(o=>o.display_scope===scope.id);
      const valid=new Set(operations.map(o=>o.id));
      const edges=study.edges.filter(e=>e.display_scope===scope.id).map(e=>({...e,from:e.from_step_id,to:e.to_step_id,type:e.relationship_type}));
      // Only named endpoints recorded by the study may enter this process graph.
      for(const endpoint of study.boundary_nodes) {
        if(!endpoint.id||valid.has(endpoint.id)||!edges.some(e=>e.from===endpoint.id||e.to===endpoint.id))continue;
        operations.push({...endpoint,name:endpoint.name||endpoint.label||endpoint.role||endpoint.id,kind:'boundary',sources:endpoint.sources||[],gaps:endpoint.gaps||[]});valid.add(endpoint.id);
      }
      layout=processLayout(operations,edges);
      selectedOp=operations.find(o=>o.id===state.step)||operations.find(o=>edges.some(e=>e.from===o.id)&&!edges.some(e=>e.to===o.id))||operations[0]||null;
      state.step=selectedOp?.id||null;
      processChoices.set(state.component,{scope:state.scope,step:state.step});
      renderScopeBar();
      if(!operations.length)empty('The product’s factory route is not mapped yet','This study has separately scoped manufacturing examples. Choose one to explore its recorded steps.',study.scopes.filter(s=>s.kind==='reference').map(s=>'<button class="secondary-button" data-scope="'+esc(s.id)+'">'+esc(scopeAliases[s.id]||s.name)+'</button>').slice(0,2).join(''));
    }else {
      layout={nodes:[],edges:[],width:0,height:0};
      empty('Manufacturing study not yet added','The component is in the product graph. Its manufacturing process will appear here when that research is recorded.','<button class="primary-button" data-view="components">Back to this component</button><button class="secondary-button" data-example="L2-019">Explore the power-converter study</button>');
    }
  }else layout=componentLayout(n.id,nodes,data.edges);
  draw();renderInspector();
  const remembered=cameraCache.get(stateKey());
  if(previous.component===state.component&&previous.scope===state.scope&&previous.view===state.view&&previous.step!==state.step&&selectedOp)centerOn(selectedOp.id);
  else if(remembered){camera={...remembered};applyCamera();}
  else if(state.view==='manufacturing'&&layout.nodes.length) {camera.k=.9;centerOn(selectedOp?.id||layout.nodes[0].id);}
  else fit(true);
  if(location.hash!==href({}))history.replaceState(null,'',href({}));
  announce((state.view==='components'?'Components of ':'Manufacturing of ')+n.name+'. '+layout.nodes.length+' visible nodes.');
}

function empty(title,description,buttons='') {$('empty-state').hidden=false;$('empty-state').innerHTML='<div class="empty-symbol" aria-hidden="true">◇</div><h2>'+esc(title)+'</h2><p>'+esc(description)+'</p>'+buttons;}
function renderScopeBar() {
  const bar=$('route-bar');bar.hidden=false;
  const note=scope.kind==='reference'?'Reference workflow · '+(scope.applicability==='exact_product'||String(scope.scope).includes('service')?'outside the factory route':'separate producer or product'):'Product route · '+(study.entry.component_id==='RACK'?'conditional methods and unresolved factory steps':'factory steps unresolved');
  bar.innerHTML='<label for="scope-select">Process</label><select id="scope-select">'+study.scopes.map(s=>'<option value="'+esc(s.id)+'"'+(s.id===scope.id?' selected':'')+'>'+esc(s.kind==='target'?'This product · '+(study.operations.some(o=>o.display_scope===s.id&&o.detail_state==='operation')?'researched route':'route unresolved'):scopeAliases[s.id]||s.name)+'</option>').join('')+'</select><span class="scope-note">'+esc(note)+'. Connections show recorded relationships; unconnected records have no established order.</span>';
  $('scope-select').onchange=e=>navigate({scope:e.target.value,step:null});
}
function draw() {
  const isProcess=state.view==='manufacturing', selected=isProcess?selectedOp?.id:state.component;
  const incoming=new Set(data.edges.filter(e=>e.to===state.component).map(e=>e.from));
  const uncertain=new Set(data.edges.filter(e=>e.from===state.component&&e.type==='unresolved').map(e=>e.to));
  $('nodes').innerHTML=layout.nodes.map(n=>{
    const count=data.edges.filter(e=>e.from===n.id).length;
    const researched=data.studies.some(s=>studyIncludes(s,n.id));
    const cls=['graph-node',n.id===selected?'selected':'',!isProcess&&incoming.has(n.id)?'parent':'',!isProcess&&uncertain.has(n.id)?'uncertain':'',isProcess&&n.detail_state==='evidence_gap'?'gap':''].filter(Boolean).join(' ');
    const bottom=isProcess?(n.detail_state==='expanded'?'Stage summary':n.detail_state==='evidence_gap'?'Method unresolved':n.kind==='reference'?'Reference operation':n.kind==='boundary'?'Outside boundary':'Conditional method'):
      incoming.has(n.id)?'↑ Parent assembly':count?count+' mapped parts':n.boundary==='evidence_gap'?'Component detail unresolved':'Component boundary';
    return '<button class="'+cls+'" data-node="'+esc(n.id)+'" style="left:'+n.x+'px;top:'+n.y+'px" aria-label="'+esc(n.name)+'. '+esc(bottom)+(isProcess?'. Show step details':'. Open component branch')+'" aria-pressed="'+(n.id===selected)+'" title="'+esc(n.name)+'"><span class="node-top"><span>'+esc(n.id)+'</span>'+(researched&&!isProcess?'<span class="research-dot">● Process study</span>':'')+'</span><span class="node-name">'+esc(isProcess?n.name:short(n))+'</span><span class="node-bottom"><span>'+esc(bottom)+'</span><span aria-hidden="true">'+(isProcess?'↗':count?'→':'◇')+'</span></span></button>';
  }).join('');
  const positions=new Map(layout.nodes.map(n=>[n.id,n]));
  $('edges').setAttribute('width',layout.width);$('edges').setAttribute('height',layout.height);
  $('edges').innerHTML='<defs><marker id="arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto" markerUnits="strokeWidth"><path d="M0 0 L7 3.5 L0 7" fill="none" stroke="#a6b6a8" stroke-width="1.1"/></marker></defs>'+layout.edges.filter(e=>positions.has(e.from)&&positions.has(e.to)).map((e,i)=>'<path class="graph-edge '+esc(e.type)+' '+(e.from===selected||e.to===selected?'related':'')+'" d="'+edgePath(positions.get(e.from),positions.get(e.to),i,e.mirrored)+'" marker-end="url(#arrow)"><title>'+esc(e.type==='unresolved'?'Known descendant; immediate parent unresolved':human(e.type))+(e.quantity?' · '+esc(e.quantity):'')+(e.condition?' · '+esc(e.condition):'')+'</title></path>').join('');
  $('graph-labels').innerHTML=(layout.labels||[]).map(l=>'<div class="graph-label" style="left:'+l.x+'px;top:'+l.y+'px">'+esc(l.text)+'</div>').join('');
  $('legend').innerHTML=isProcess?'<span><i></i> Recorded relationship</span><span><i class="dashed"></i> Conditional / rework</span>':'<span><i></i> Contains</span><span><i class="dashed"></i> Parent unresolved</span>';
  $('graph-count').textContent=layout.nodes.length+' shown · '+(isProcess?'scoped process':data.nodes.length+' component records');
  $('canvas-help').textContent=isProcess?'Select a step for details · Drag to follow the process':'Select a component to open its branch · Drag to pan';
  $('minimap').hidden=!layout.nodes.length;
  drawMini();
}
function drawMini() {
  if(!layout?.nodes.length)return;
  const s=Math.min(170/layout.width,90/layout.height),ox=(180-layout.width*s)/2,oy=(100-layout.height*s)/2;
  const selected=state.view==='components'?state.component:selectedOp?.id;
  const pos=new Map(layout.nodes.map(n=>[n.id,n]));
  $('minimap').innerHTML=layout.edges.filter(e=>pos.has(e.from)&&pos.has(e.to)).map(e=>{const a=pos.get(e.from),b=pos.get(e.to);return '<line x1="'+(ox+(a.x+NODE_W/2)*s)+'" y1="'+(oy+(a.y+NODE_H/2)*s)+'" x2="'+(ox+(b.x+NODE_W/2)*s)+'" y2="'+(oy+(b.y+NODE_H/2)*s)+'" stroke="#c2cec0" stroke-width=".7"/>';}).join('')+layout.nodes.map(n=>'<rect x="'+(ox+n.x*s)+'" y="'+(oy+n.y*s)+'" width="'+Math.max(2,NODE_W*s)+'" height="'+Math.max(2,NODE_H*s)+'" rx="1" fill="'+(n.id===selected?'#365b43':'#b3c2ad')+'"/>').join('')+'<rect id="mini-viewport" fill="#446b4810" stroke="#507657" stroke-width=".8"/>';
  $('minimap').dataset.scale=s;$('minimap').dataset.ox=ox;$('minimap').dataset.oy=oy;
}
function applyCamera() {
  world.style.transform=`translate(${camera.x}px,${camera.y}px) scale(${camera.k})`;
  $('zoom-level').textContent=Math.round(camera.k*100)+'%';
  const rect=$('mini-viewport');if(rect){const s=+$('minimap').dataset.scale,ox=+$('minimap').dataset.ox,oy=+$('minimap').dataset.oy;rect.setAttribute('x',ox-camera.x/camera.k*s);rect.setAttribute('y',oy-camera.y/camera.k*s);rect.setAttribute('width',canvas.clientWidth/camera.k*s);rect.setAttribute('height',canvas.clientHeight/camera.k*s);}
}
function fit(initial=false) {
  if(!layout?.nodes.length){camera={x:0,y:0,k:1};applyCamera();return;}
  const w=canvas.clientWidth,h=canvas.clientHeight-100;
  camera.k=Math.min(initial?1:1.2,Math.max(initial?.75:.08,Math.min((w-70)/layout.width,h/layout.height)));
  camera.x=(w-layout.width*camera.k)/2;camera.y=(h-layout.height*camera.k)/2+20;applyCamera();
}
function centerOn(id) {
  const n=layout?.nodes.find(n=>n.id===id);if(!n){fit();return;}
  camera.x=canvas.clientWidth*(state.view==='manufacturing'?.23:.5)-(n.x+NODE_W/2)*camera.k;
  camera.y=(canvas.clientHeight-80)*(state.view==='manufacturing'?.28:.5)-(n.y+NODE_H/2)*camera.k;applyCamera();
}
function zoom(factor,x=canvas.clientWidth/2,y=canvas.clientHeight/2) {
  const old=camera.k;camera.k=Math.max(.08,Math.min(2.5,camera.k*factor));camera.x=x-(x-camera.x)*camera.k/old;camera.y=y-(y-camera.y)*camera.k/old;applyCamera();
}

function renderInspector() {
  const component=nodes.get(state.component), op=state.view==='manufacturing'?selectedOp:null;
  const item=op||component, sources=item.sources||[], gaps=item.gaps||[];
  let out='<div class="inspector-heading"><div class="eyebrow">'+(op?'Process step':'Component')+' / '+esc(item.id)+'</div><button class="close-details" data-close-details aria-label="Close details">×</button></div><h2>'+esc(item.name)+'</h2>';
  out+='<span class="tag '+(badge(item).includes('unresolved')||badge(item).includes('Inferred')?'amber':'')+'">'+esc(badge(item))+'</span>';
  out+='<div class="detail-tabs" role="group" aria-label="Node details"><button data-tab="overview" aria-pressed="'+(detailTab==='overview')+'">Overview</button><button data-tab="evidence" aria-pressed="'+(detailTab==='evidence')+'">Evidence · '+sources.length+'</button></div>';
  if(detailTab==='evidence') {
    if(op)out+='<p class="subtle">Evidence for '+esc(scopeAliases[scope.id]||scope.name)+'.</p>';
    out+=sources.length?sources.map(s=>{const url=safeURL(s.url);return '<div class="source">'+(url?'<a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+esc(s.title)+' ↗</a>':esc(s.title))+'<p>'+esc(s.locator)+'</p>'+(s.claim?'<p>'+esc(s.claim)+'</p>':'')+'</div>';}).join(''):'<p class="subtle">No direct source link is recorded for this item.</p>';
    if(op?.evidence?.length)out+='<details><summary>Claim-by-claim evidence ('+op.evidence.length+')</summary>'+op.evidence.map(e=>'<div class="evidence-claim"><small>'+esc(human(e.label))+' · '+esc(human(e.applicability))+'</small>'+esc(e.claim)+'</div>').join('')+'</details>';
    if(gaps.length)out+='<details open><summary>Open research questions ('+gaps.length+')</summary>'+gaps.map(g=>'<div class="field">'+stringify(g.question||g.description||g.detail||g.record||g)+'<p class="subtle">'+esc(g.id)+'</p></div>').join('')+'</details>';
    if(!op) {
      const relationships=data.edges.filter(e=>e.to===component.id);
      out+='<details><summary>Placement evidence</summary>'+relationships.map(e=>'<div class="field"><strong>'+esc(nodes.get(e.from).name)+'</strong><p>'+esc(e.type==='unresolved'?'Known ancestor; immediate parent unresolved':'Direct parent')+'</p>'+e.sources.map(s=>{const u=safeURL(s.url);return u?'<p><a href="'+esc(u)+'" target="_blank" rel="noopener noreferrer">'+esc(s.title)+'</a> · '+esc(s.locator)+'</p>':'';}).join('')+'</div>').join('')+'</details>';
    }
  }else if(op) {
    out+=field('Action',op.action||op.investigated_action)+field('Received state',op.incoming_state)+field('Result / handoff',op.outgoing_state||op.handoff)+field('Who performs it',op.performer)+field('Equipment',op.equipment)+field('Measurements',op.measurement)+field('Decision',op.decision);
    if(op.object_ids?.some(id=>nodes.has(id)))out+='<section class="field"><span class="field-label">Related components</span>'+op.object_ids.filter(id=>nodes.has(id)).map(id=>'<button class="connected-step" data-component="'+esc(id)+'">'+esc(short(nodes.get(id)))+' →</button>').join('')+'</section>';
    const related=layout.edges.filter(e=>e.from===op.id||e.to===op.id);
    if(related.length)out+='<section class="field"><span class="field-label">Connected steps</span>'+related.map(e=>{const id=e.from===op.id?e.to:e.from,n=layout.nodes.find(n=>n.id===id);return n?'<button class="connected-step" data-step="'+esc(id)+'"><small>'+esc(e.from===op.id?'Outgoing':'Incoming')+' · '+esc(human(e.type))+'</small>'+esc(n.name)+'</button>'+(e.condition?'<p class="subtle">'+esc(e.condition)+'</p>':''):'';}).join('')+'</section>';
    out+='<details><summary>Handling, settings and exceptions</summary>'+field('Handling',op.handling)+field('Settings',op.settings)+field('Digital work',op.digital_work)+field('Timing',op.timing)+field('Exceptions',op.exceptions)+'</details>';
    const children=study.operations.filter(o=>o.parent_stage===op.id&&o.display_scope===scope.id);
    if(children.length)out+='<section class="field"><span class="field-label">Actions within this stage</span>'+children.map(o=>'<button class="connected-step" data-step="'+esc(o.id)+'">'+esc(o.name)+'</button>').join('')+'</section>';
    const annotations=(study.relationship_annotations||[]).filter(e=>e.display_scope===scope.id&&(e.from_step_id===op.id||e.to_step_id===op.id));
    if(annotations.length)out+='<details><summary>Relationship notes</summary>'+annotations.map(e=>'<div class="field">'+stringify(e.condition||e.relationship_scope||e.name||e.id)+'</div>').join('')+'</details>';
    if(op.detail_state==='expanded')out+='<div class="notice">This stage summarizes its detailed actions; it is not an additional manufacturing pass.</div>';
    if(op.detail_state==='evidence_gap')out+='<div class="notice">This is a researched gap, not a confirmed factory operation.</div>';
    if(scope.kind==='reference')out+='<div class="notice">This operation belongs to the selected reference workflow. Its use for this exact component has not been established.</div>';
  }else {
    out+=field('What it does',component.function)+companyDetails(component.supplier);
    const parentEdges=data.edges.filter(e=>e.to===component.id);
    out+=parentEdges.map(e=>field(e.type==='contains'?'Quantity per '+short(nodes.get(e.from)):'Quantity within '+short(nodes.get(e.from)),e.quantity)).join('');
    if(component.quantity_note)out+='<p class="subtle">'+esc(component.quantity_note)+'</p>';
    if(state.view==='components')out+='<button class="primary-button" data-view="manufacturing">View manufacturing process →</button>';
    else out+='<button class="secondary-button" data-view="components">← Back to component graph</button>';
    const entry=data.studies.find(s=>studyIncludes(s,component.id));
    out+=field('Manufacturing research',entry?'Study available · reviewed with gaps':'Not yet researched');
    if(scope&&!selectedOp)out+=field('Process boundary',scope.boundary||scope.route_variant);
    const childCount=data.edges.filter(e=>e.from===component.id).length;
    if(!childCount)out+='<div class="notice">'+(component.boundary==='terminal_product'?'Current component-mapping boundary reached. Deeper construction has not been mapped.':'Further component detail remains unresolved.')+'</div>';
    if(component.boundary_reason)out+='<details><summary>Component scope</summary><p>'+esc(component.boundary_reason)+'</p>'+field('Part numbers',component.part_numbers)+'</details>';
    if(component.notes)out+='<details><summary>Qualifications</summary>'+stringify(component.notes)+'</details>';
    if(component.unknowns)out+='<details><summary>Unresolved details</summary>'+stringify(component.unknowns)+'</details>';
  }
  $('inspector').innerHTML=out;
}

function toggleDetails(show) {document.body.classList.toggle('details-hidden',!show);$('details-toggle').setAttribute('aria-expanded',String(show));}
function showError(error) {$('selection-title').textContent='The research could not be loaded';$('inspector').innerHTML='<div class="error">'+esc(error.message)+'</div>';announce(error.message);}

// Route selections are shareable; the browser's Back / Forward preserve navigation.
window.addEventListener('hashchange',()=>{if(data)renderFromURL().catch(showError);});
document.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.node){if(moved){moved=false;return;} if(state.view==='components')navigate({component:b.dataset.node,scope:null,step:null});else{detailTab='overview';toggleDetails(true);navigate({step:b.dataset.node});}}
  else if(b.dataset.view)navigate({view:b.dataset.view,scope:null,step:null});
  else if(b.dataset.scope)navigate({scope:b.dataset.scope,step:null});
  else if(b.dataset.component)navigate({component:b.dataset.component,view:'components',scope:null,step:null});
  else if(b.dataset.example)navigate({component:b.dataset.example,view:'manufacturing',scope:'A-R02',step:null});
  else if(b.dataset.step){detailTab='overview';navigate({step:b.dataset.step});}
  else if(b.dataset.tab){detailTab=b.dataset.tab;renderInspector();}
  else if(b.hasAttribute('data-close-details'))toggleDetails(false);
});
$('reset').onclick=()=>navigate({component:data.root,view:'components',scope:null,step:null});
$('back').onclick=()=>history.back();
$('details-toggle').onclick=()=>toggleDetails(document.body.classList.contains('details-hidden'));
$('zoom-in').onclick=()=>zoom(1.25);$('zoom-out').onclick=()=>zoom(.8);$('zoom-level').onclick=()=>zoom(1/camera.k);
$('fit').onclick=()=>fit();$('center').onclick=()=>centerOn(state.view==='components'?state.component:selectedOp?.id);
$('search').addEventListener('input',e=>{
  if(!data)return;const q=e.target.value.trim().toLowerCase(),box=$('search-results');
  box.hidden=!q;$('search').setAttribute('aria-expanded',String(!!q));if(!q)return;
  const found=data.nodes.filter(n=>(n.id+' '+n.name+' '+short(n)).toLowerCase().includes(q)).slice(0,12);
  box.innerHTML=found.length?found.map(n=>'<button data-component="'+esc(n.id)+'">'+esc(n.name)+'<small>'+esc(n.id)+' · '+(data.studies.some(s=>studyIncludes(s,n.id))?'Manufacturing study available':'Components mapped')+'</small></button>').join(''):'<div class="field">No matching component</div>';
});
$('search').addEventListener('keydown',e=>{if(e.key==='ArrowDown'){e.preventDefault();$('search-results').querySelector('button')?.focus();}if(e.key==='Escape'){$('search-results').hidden=true;e.target.blur();}});
$('search-results').addEventListener('keydown',e=>{const list=[...e.currentTarget.querySelectorAll('button')],i=list.indexOf(document.activeElement);if(e.key==='ArrowDown'){e.preventDefault();list[Math.min(list.length-1,i+1)]?.focus();}if(e.key==='ArrowUp'){e.preventDefault();if(i===0)$('search').focus();else list[i-1]?.focus();}if(e.key==='Escape'){$('search-results').hidden=true;$('search').focus();}});
document.addEventListener('keydown',e=>{if(e.key==='/'&&!['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)){e.preventDefault();$('search').focus();}if(e.key==='Escape'){$('search-results').hidden=true;$('search').setAttribute('aria-expanded','false');}});
document.addEventListener('pointerdown',e=>{if(!e.target.closest('.search')){$('search-results').hidden=true;$('search').setAttribute('aria-expanded','false');}});

canvas.addEventListener('wheel',e=>{if(e.target.closest('#empty-state'))return;e.preventDefault();if(e.ctrlKey||e.metaKey){const r=canvas.getBoundingClientRect();zoom(Math.exp(-e.deltaY*.006),e.clientX-r.left,e.clientY-r.top);}else{camera.x-=e.deltaX;camera.y-=e.deltaY;applyCamera();}},{passive:false});
canvas.addEventListener('pointerdown',e=>{
  if(e.target.closest('.canvas-controls,#minimap,#empty-state')||e.button>0)return;
  moved=false;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pointers.size===2){const [a,b]=[...pointers.values()];pinch={distance:Math.hypot(a.x-b.x,a.y-b.y)};drag=null;}
  else drag={id:e.pointerId,x:e.clientX,y:e.clientY,cx:camera.x,cy:camera.y};
});
window.addEventListener('pointermove',e=>{
  if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pointers.size===2&&pinch){const [a,b]=[...pointers.values()],d=Math.hypot(a.x-b.x,a.y-b.y),r=canvas.getBoundingClientRect();zoom(d/Math.max(pinch.distance,1),(a.x+b.x)/2-r.left,(a.y+b.y)/2-r.top);pinch.distance=d;moved=true;return;}
  if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
  if(Math.hypot(dx,dy)>4){moved=true;canvas.classList.add('dragging');camera.x=drag.cx+dx;camera.y=drag.cy+dy;applyCamera();}
});
function endPointer(e){pointers.delete(e.pointerId);drag=null;pinch=null;canvas.classList.remove('dragging');}
window.addEventListener('pointerup',endPointer);window.addEventListener('pointercancel',endPointer);
canvas.addEventListener('keydown',e=>{if(e.target!==canvas)return;const delta={ArrowLeft:[60,0],ArrowRight:[-60,0],ArrowUp:[0,60],ArrowDown:[0,-60]}[e.key];if(delta){e.preventDefault();camera.x+=delta[0];camera.y+=delta[1];applyCamera();}if(e.key==='+'||e.key==='=')zoom(1.2);if(e.key==='-')zoom(1/1.2);if(e.key==='0')fit();});
$('minimap').addEventListener('pointerdown',e=>{e.stopPropagation();const r=e.currentTarget.getBoundingClientRect(),s=+e.currentTarget.dataset.scale,ox=+e.currentTarget.dataset.ox,oy=+e.currentTarget.dataset.oy;const x=((e.clientX-r.left)/r.width*180-ox)/s,y=((e.clientY-r.top)/r.height*100-oy)/s;camera.x=canvas.clientWidth/2-x*camera.k;camera.y=canvas.clientHeight/2-y*camera.k;applyCamera();});
new ResizeObserver(()=>{if(layout)applyCamera();}).observe(canvas);
const narrowScreen=matchMedia('(max-width:760px)');
if(narrowScreen.matches)toggleDetails(false);
narrowScreen.addEventListener('change',event=>{if(event.matches)toggleDetails(false);});
try {data=await fetchJSON('/api/graph');nodes=new Map(data.nodes.map(n=>[n.id,n]));await renderFromURL();}catch(error){showError(error);}
