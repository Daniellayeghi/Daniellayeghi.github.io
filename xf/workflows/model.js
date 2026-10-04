export const views = ['loop', 'bench', 'evidence', 'compare', 'about'];

export function readState(hash, workflows) {
  const p = new URLSearchParams(hash.replace(/^#/, ''));
  const workflow = workflows.find(w => w.id === p.get('workflow')) || workflows[0];
  const requestedStep = Number(p.get('step') || 0);
  return {
    workflow: workflow.id,
    view: views.includes(p.get('view')) ? p.get('view') : 'loop',
    step: Number.isInteger(requestedStep) && requestedStep >= 0 && requestedStep < workflow.steps.length ? requestedStep : 0,
    source: workflow.sourceIds.includes(p.get('source')) ? p.get('source') : null,
  };
}

export function link(state, changes = {}) {
  const next = { ...state, ...changes };
  if (changes.workflow && changes.workflow !== state.workflow) { next.step = 0; next.source = null; }
  const p = new URLSearchParams();
  for (const key of ['workflow', 'view', 'step', 'source']) {
    if (next[key] !== null && next[key] !== undefined && (key !== 'step' || next.view === 'loop' || next.step !== 0)) p.set(key, next[key]);
  }
  return '#' + p.toString();
}

export function searchWorkflows(workflows, query) {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return workflows.filter(w => {
    const haystack = JSON.stringify(w).toLocaleLowerCase();
    return terms.every(term => haystack.includes(term));
  });
}

export function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}
