import { readState, link, searchWorkflows, escapeHTML as e } from './model.js';

const $ = id => document.getElementById(id);
let workflows, sources, provenance, state;
const arrow = '<span aria-hidden="true">↗</span>';
const number = n => String(n + 1).padStart(2, '0');
const list = items => '<ul class="plain-list">' + items.map(x => '<li>' + e(x) + '</li>').join('') + '</ul>';
const section = (label, text, className = '') => '<section class="info-block ' + className + '"><h3>' + e(label) + '</h3><p>' + e(text) + '</p></section>';
const sourceLabels = {'ROOT-S13':'OCP qualification','ROOT-S06':'Purdue experiment','ROOT-S07':'OCP roadmap','ROOT-S04':'Corintis','ROOT-S12':'CoolIT','ROOT-S14':'Infineon','ROOT-S09':'IBM','ROOT-S03':'ficonTEC','ROOT-S01':'SK hynix','ROOT-S08':'Samtec','A-S-FAN':'SANYO DENKI'};
function renderWorkflowMenu() {
  const found = searchWorkflows(workflows, $('search').value);
  $('result-count').textContent = found.length;
  $('workflow-list').innerHTML = found.length ? found.map(w => {
    const active = w.id === state.workflow && !['compare','about'].includes(state.view);
    return '<a class="workflow-item' + (active ? ' active' : '') + '" href="' + link(state, { workflow:w.id, view:['loop','bench','evidence'].includes(state.view) ? state.view : 'loop' }) + '"' + (active ? ' aria-current="page"' : '') + '><span class="item-number">' + number(workflows.indexOf(w)) + '</span><span><span class="item-domain">' + e(w.domain) + '</span><strong>' + e(w.name) + '</strong></span><span class="item-arrow" aria-hidden="true">↗</span></a>';
  }).join('') : '<div class="no-results"><strong>No matching workflow</strong><p>Try a measurement, material or process, such as “pressure”, “bonding” or “waveform”.</p><button class="text-button" data-clear-search>Clear search</button></div>';
}

function workflowHeader(w) {
  return '<header class="workflow-header"><h1>' + e(w.title) + '</h1><p class="intro">' + e(w.summary) + '</p></header>' +
    '<nav class="view-tabs" aria-label="Workflow views">' + [['loop','The loop'],['evidence','Supporting material']].map(([v,label]) => '<a href="' + link(state,{view:v,source:null}) + '"' + (state.view === v ? ' aria-current="page"' : '') + '>' + label + '</a>').join('') + '</nav>';
}

function sourceEntry(w, id, compact = false) {
  const s = sources.get(id), index = w.sourceIds.indexOf(id) + 1;
  const title = compact ? sourceLabels[id] || s.publisher : s.title;
  return '<article id="source-' + e(id) + '" class="source-entry' + (state.source === id ? ' highlighted' : '') + '"><div class="source-meta">[' + index + '] ' + e(s.publisher) + (s.published_at ? ' · ' + e(s.published_at) : '') + '</div><h3><a href="' + e(s.url) + '" target="_blank" rel="noopener noreferrer">' + e(title) + ' ' + arrow + '</a></h3><p>' + e(s.claim || 'Manufacturer account of simulation, prototyping, acoustic/flow measurement and development feedback.') + '</p><details><summary>Source details & limits</summary>' + (compact ? '<p>' + e(s.title) + '</p>' : '') + '<p>' + e(s.reading_extent || s.actual_reading_extent) + '</p><p>' + e(s.limit || s.limitations) + '</p></details></article>';
}

function contextDetails(w) {
  return '<details class="secondary-detail"><summary>Engineering context & verification</summary><div class="expanded-detail">' + section('Engineering owner',w.owner) + section('Problem',w.problem) + section('Required result',w.deliver) + '<section class="info-block"><h3>Verify</h3>' + list(w.verification) + '</section>' + section('Why it could matter',w.value) + section('Next test of the idea',w.nextTest) + '</div></details>';
}

function loopView(w) {
  const step = w.steps[state.step];
  return '<section class="loop-section" aria-label="Experimental loop"><div class="loop-caption">Proposed experiment · select a stage</div>' +
    '<div class="loop-track" aria-label="Experiment stages">' + w.steps.map((s,i) => '<a class="step' + (i === state.step ? ' selected' : '') + '" href="' + link(state,{step:i,source:null}) + '"' + (i === state.step ? ' aria-current="step"' : '') + '><span class="step-number">' + number(i) + '</span><strong>' + e(s.title) + '</strong></a>').join('') + '</div>' +
    '<div class="return-path"><span aria-hidden="true">↶</span> Revise the build or hypothesis, then test again.</div>' +
    '<div class="loop-body"><article class="step-detail" aria-labelledby="step-heading"><div class="step-detail-header"><h2 id="step-heading">' + e(step.title) + '</h2><div class="step-controls"><button aria-label="Previous stage" data-step="' + (state.step - 1) + '"' + (state.step === 0 ? ' disabled' : '') + '>←</button><button aria-label="Next stage" data-step="' + (state.step + 1) + '"' + (state.step === w.steps.length - 1 ? ' disabled' : '') + '>→</button></div></div><p class="step-action">' + e(step.action) + '</p><div class="step-facts">' + section('Change',step.change) + section('Measure',step.measure) + section('Decide',step.decision,'decision') + '</div></article>' +
    '<aside class="support-panel" aria-label="Supporting material for this stage"><h2>Supporting material</h2><p class="evidence-basis">' + e(step.basis) + '.</p>' + step.sourceIds.map(id => sourceEntry(w,id,true)).join('') + '<a class="all-sources" href="' + link(state,{view:'evidence',source:null}) + '">All supporting material (' + w.sourceIds.length + ') →</a></aside></div></section>' +
    '<div class="secondary-details"><details class="secondary-detail"><summary>Bench & LLM role</summary><div class="expanded-detail">' + benchView(w) + '</div></details>' + contextDetails(w) + '</div>';
}

function benchView(w) {
  const b = w.bench;
  return '<section class="bench-section"><div class="section-title"><h2>The physical bench</h2><span class="subtle">Proposed allocation of work</span></div>' +
    '<div class="bench-flow"><div><span class="eyebrow">Specimen & fixture</span><p>' + e(b.specimen) + '</p></div><span class="flow-arrow" aria-hidden="true">→</span><div><span class="eyebrow">Controlled stimulus</span><p>' + e(b.stimulus) + '</p></div><span class="flow-arrow" aria-hidden="true">→</span><div><span class="eyebrow">Sensing & instruments</span>' + list(b.instruments) + '</div></div>' +
    '<article class="reasoning-card"><div class="reasoning-title"><span class="eyebrow">LLM · orchestration and interpretation</span><h3>Choose the next informative experiment.</h3></div><div class="reasoning-columns"><div><h4>Reasons over</h4>' + list(b.llmInputs) + '</div><div><h4>Proposes and interprets</h4><p>' + e(b.llmDecision) + '</p></div></div><p class="tool-boundary">' + e(b.tools) + '</p></article>' +
    '<div class="role-list">' + [['01','Hard automation',b.hard,'Core'],['02','Conventional robotics',b.robot,'Where useful'],['03','Flexible learned robotics',b.flexible,'Conditional']].map(([n,title,body,badge]) => '<section class="role-row"><span class="role-number">' + n + '</span><div><h3>' + title + '<span>' + badge + '</span></h3><p>' + e(body) + '</p></div></section>').join('') + '</div>' +
    '<div class="two-column bench-bottom"><section class="info-block"><h3>Verify the result</h3>' + list(w.verification) + '</section>' + section('Physical time that remains',b.wait) + '</div></section>';
}

function evidenceView(w) {
  return '<section class="evidence-view"><p class="evidence-intro">' + e(w.evidenceSummary) + '</p><p class="scope-note">' + e(w.scope) + '</p><div class="source-list">' + w.sourceIds.map(id => sourceEntry(w,id)).join('') + '</div>' +
    '<details class="secondary-detail"><summary>Open questions & access</summary><div class="expanded-detail">' + section('Existing baseline',w.baseline) + section('Access required',w.access) + '<section class="info-block"><h3>Still to establish</h3>' + list(w.unknowns) + '</section></div></details>' +
    '<details class="secondary-detail"><summary>Trace to the saved research</summary><div class="expanded-detail"><p>Reviewer record <code>' + e(w.record) + '</code>. This review accepts a qualified opportunity assessment, not a confirmed factory route.</p>' + (w.anchors.length ? w.anchors.map(a => '<div class="trace-row"><a href="' + e(a.url) + '" target="_blank" rel="noopener">' + e(a.label) + ' ' + arrow + '</a><p>' + a.ids.map(id => '<code>' + e(id) + '</code>').join(' ') + '</p></div>').join('') : '<p>This follow-up is outside the accepted rack-route inventory.</p>') + '<div class="source-links"><a href="./data/review.md" target="_blank" rel="noopener">Full written assessment ' + arrow + '</a><a href="./data/provenance.json" target="_blank" rel="noopener">Snapshot and provenance ' + arrow + '</a></div></div></details></section>';
}

function compareView() {
  return '<div class="page-heading"><span class="eyebrow">Six concrete experimental workflows</span><h1>Compare the engineering decisions.</h1><p class="intro">Documented iteration, practical access and our proposed contribution are separate questions. No numerical commercial ranking is established.</p></div><p class="mobile-table-hint">Swipe across for evidence and access →</p><div class="comparison-scroll" tabindex="0" aria-label="Workflow comparison; scroll horizontally on small screens"><table class="comparison"><thead><tr><th scope="col">Workflow</th><th scope="col">Physical change</th><th scope="col">Evidence for iteration</th><th scope="col">First access requirement</th></tr></thead><tbody>' + workflows.map(w => '<tr><th scope="row"><a href="' + link(state,{workflow:w.id,view:'loop'}) + '"><span class="item-domain">' + e(w.domain) + '</span>' + e(w.name) + ' ' + arrow + '</a></th><td>' + e(w.change) + '</td><td><strong>' + e(w.evidenceLabel) + '</strong><p>' + e(w.evidenceSummary) + '</p></td><td>' + e(w.access) + '</td></tr>').join('') + '</tbody></table></div><section class="pilot-callout"><span class="eyebrow">The common test</span><p>Does the same bench with an LLM produce more independently verified solutions, fewer unnecessary physical changes, or less engineering effort than an expert using conventional experiment planning?</p><p class="subtle">Customer demand, campaign economics and the LLM’s incremental contribution remain unverified for every candidate.</p></section>';
}

function aboutView() {
  return '<div class="page-heading"><span class="eyebrow">Scope & evidence standards</span><h1>Use the research to assess a bench.</h1><p class="intro">A focused view of the experimental workflows relevant to sensing, instrumentation, robotics and LLM-assisted engineering.</p></div><div class="scope-stats"><div><strong>' + provenance.components + '</strong><span>mapped component records</span></div><div><strong>' + provenance.accepted_studies + '</strong><span>accepted manufacturing studies, with gaps</span></div><div><strong>6</strong><span>candidate workflows presented here</span></div></div>' +
    '<div class="about-copy"><h2>What is included</h2><p>This interface synthesizes six candidates from the completed 4 October 2026 review. Thermal-interface work is a conditional first pilot; access to a better optical, power or materials campaign could change that preference. The original review retains additional alternatives.</p><h2>How to read the loop</h2><p>The stage sequence describes a proposed integrated experiment. Each selected stage identifies the documented methods behind it and the part we are proposing. It is not a claim that the whole autonomous bench exists or that the sequence is the selected rack’s manufacturing route.</p><h2>What the data does not establish</h2><p>No customer commitment, price, percentage of flexible automation or measured LLM advantage is established. Expensive hardware alone does not establish a valuable commercial workflow. We need an owner-controlled problem, useful measurements, change authority and independently verified outcomes.</p><h2>Research coverage</h2><p>The snapshot covers ' + provenance.covered_component_ids + ' component IDs with accepted-with-gaps manufacturing research. Another ' + provenance.in_research_component_ids + ' were in research and ' + provenance.queued_component_ids + ' queued. This interface does not promote unfinished work to accepted fact. The graph explorer is a separate publication and may use an earlier snapshot.</p><h2>Evidence and preservation</h2><p>Original source URLs, stable reviewer and database IDs, reading limits and input hashes are retained. The source graph and review history are not rewritten by this interface.</p><div class="source-links"><a href="./data/review.md" target="_blank" rel="noopener">Read the full assessment ' + arrow + '</a><a href="./data/provenance.json" target="_blank" rel="noopener">Inspect provenance ' + arrow + '</a><a href="https://daniellayeghi.github.io/xf/" target="_blank" rel="noopener">Open the product graph ' + arrow + '</a></div></div>';
}

function render() {
  const previous = state;
  state = readState(location.hash, workflows);
  const w = workflows.find(x => x.id === state.workflow);
  $('workflows-link').href = link(state,{view:'loop',source:null});
  $('compare-link').href = link(state,{view:'compare',source:null});
  $('compare-link').toggleAttribute('aria-current',state.view === 'compare');
  if (state.view === 'compare') $('compare-link').setAttribute('aria-current','page');
  $('workflows-link').toggleAttribute('aria-current',['loop','bench','evidence'].includes(state.view));
  if (['loop','bench','evidence'].includes(state.view)) $('workflows-link').setAttribute('aria-current','page');
  document.title = 'XF — ' + (state.view === 'compare' ? 'Compare workflows' : state.view === 'about' ? 'Research scope' : w.name);
  renderWorkflowMenu();
  $('workflow-name').textContent = w.name;
  if (previous) { $('workflow-menu').open = false; $('more-menu').open = false; }
  $('main').innerHTML = state.view === 'compare' ? compareView() : state.view === 'about' ? aboutView() : workflowHeader(w) + (state.view === 'bench' ? benchView(w) : state.view === 'evidence' ? evidenceView(w) : loopView(w));
  $('main').insertAdjacentHTML('beforeend','<footer class="content-footer"><span>Research reviewed 4 October 2026</span><a href="#view=about">Scope & provenance</a></footer>');
  $('announcer').textContent = state.view === 'compare' ? 'Comparing six experimental workflows' : state.view === 'about' ? 'Research scope and evidence standards' : w.name + ', ' + state.view + (state.view === 'loop' ? ', stage ' + (state.step + 1) : '');
  if (state.source) requestAnimationFrame(() => $('source-' + state.source)?.scrollIntoView({block:'center',behavior:'instant'}));
  else if (previous && (previous.workflow !== state.workflow || ['compare','about'].includes(state.view) && previous.view !== state.view)) window.scrollTo({top:0,behavior:'instant'});
  if (previous && previous.workflow === state.workflow && previous.view !== state.view && ['loop','bench','evidence'].includes(state.view) && !state.source) document.querySelector('.view-tabs')?.scrollIntoView({block:'start',behavior:'instant'});
  if (previous?.view === 'loop' && state.view === 'loop' && previous.workflow === state.workflow && previous.step !== state.step) {
    const selected = document.querySelector('.step.selected');
    selected?.focus({preventScroll:true});
    if (matchMedia('(max-width: 700px)').matches) document.querySelector('.loop-section')?.scrollIntoView({block:'start',behavior:'instant'});
    if (matchMedia('(max-width: 700px)').matches) selected?.scrollIntoView({block:'nearest',inline:'center',behavior:'instant'});
  }
}

document.addEventListener('click',event => {
  if (!event.target.closest('.workflow-switcher') || event.target.closest('.workflow-item')) $('workflow-menu').open = false;
  if (!event.target.closest('.more-menu') || event.target.closest('.more-menu a')) $('more-menu').open = false;
  if (event.target.closest('.skip-link')) { event.preventDefault(); $('main').focus(); return; }
  const step = event.target.closest('[data-step]');
  if (step && !step.disabled) location.hash = link(state,{step:Number(step.dataset.step)});
  if (event.target.closest('[data-clear-search]')) { $('search').value = ''; renderWorkflowMenu(); $('search').focus(); }
});
$('search').addEventListener('input',() => { if (workflows) { renderWorkflowMenu(); $('announcer').textContent = $('result-count').textContent + ' matching workflows'; } });
document.addEventListener('keydown',event => {
  if (event.key === '/' && !['INPUT','TEXTAREA','SELECT'].includes(event.target.tagName)) { event.preventDefault(); $('workflow-menu').open = true; $('search').focus(); }
  if (event.key === 'Escape' && event.target === $('search')) { $('search').value = ''; renderWorkflowMenu(); $('workflow-menu').open = false; }
  if (event.target.matches('.step') && ['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) {
    event.preventDefault(); const w = workflows.find(x => x.id === state.workflow);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? w.steps.length - 1 : Math.max(0,Math.min(w.steps.length - 1,state.step + (event.key === 'ArrowRight' ? 1 : -1)));
    location.hash = link(state,{step:next});
  }
});
window.addEventListener('hashchange',() => { if (workflows) render(); });

try {
  const responses = await Promise.all(['workflows','sources','provenance'].map(async name => {
    const response = await fetch('./data/' + name + '.json');
    if (!response.ok) throw new Error('The research snapshot could not be loaded.');
    return response.json();
  }));
  [workflows, , provenance] = responses;
  sources = new Map(responses[1].map(s => [s.id,s]));
  render();
} catch (error) {
  $('main').innerHTML = '<div class="error"><h1>Research unavailable</h1><p>' + e(error.message) + '</p><p>Reload this page, or read the <a href="./data/review.md">written assessment</a>.</p><button onclick="location.reload()">Reload</button></div>';
}
