// Prompt Library app.js (modernized module)
// Storage structure migrated to an object so we can keep prompts and recentlyDeletedNotes together.
const STORAGE_KEY = 'promptLibrary.data';

const $ = s => document.querySelector(s);

const form = $('#prompt-form');
const titleInput = $('#title');
const contentInput = $('#content');
const modelInput = $('#model');
const promptsList = $('#prompts-list');
const countEl = $('#count');
const clearFormBtn = $('#clear-form');
const toastEl = $('#toast');

const confirmModal = $('#confirm-modal');
const confirmMessage = $('#confirm-message');
const confirmOk = $('#confirm-ok');
const confirmCancel = $('#confirm-cancel');

const template = $('#prompt-template');
const exportBtn = $('#export-btn');
const importBtn = $('#import-btn');
const importFileInput = $('#import-file');
const importModal = $('#import-modal');
const importFileName = $('#import-file-name');
const importOk = $('#import-ok');
const importCancel = $('#import-cancel');
const importOptionsForm = $('#import-options');

let prompts = [];
let recentlyDeletedNotes = []; // buffer of recently deleted notes (max 5)
let sortMode = 'newest';
const sortSelect = $('#sort-select');

// --- Metadata utilities ---
function isValidISODate(s){
  if(typeof s !== 'string') return false;
  const d = new Date(s);
  return !isNaN(d.getTime()) && d.toISOString() === s;
}

function estimateTokens(text, isCode){
  if(typeof text !== 'string') throw new Error('estimateTokens: text must be a string');
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const chars = text.length;
  let min = Math.round(0.75 * words);
  let max = Math.round(0.25 * chars);
  if(isCode) { min = Math.round(min * 1.3); max = Math.round(max * 1.3); }
  const avg = Math.max(min, max);
  let confidence = 'high';
  if(avg < 1000) confidence = 'high';
  else if(avg <= 5000) confidence = 'medium';
  else confidence = 'low';
  return {min, max, confidence};
}

function updateTimestamps(metadata){
  if(!metadata || typeof metadata !== 'object') throw new Error('updateTimestamps: metadata must be an object');
  const now = new Date().toISOString();
  if(!isValidISODate(metadata.createdAt)) throw new Error('updateTimestamps: metadata.createdAt is not a valid ISO 8601 string');
  const created = new Date(metadata.createdAt);
  const updated = new Date(now);
  if(updated.getTime() < created.getTime()) throw new Error('updateTimestamps: computed updatedAt is earlier than createdAt');
  metadata.updatedAt = now;
  return metadata;
}

function trackModel(modelName, content){
  if(typeof modelName !== 'string' || modelName.trim() === '') throw new Error('trackModel: modelName must be a non-empty string');
  if(modelName.length > 100) throw new Error('trackModel: modelName must not exceed 100 characters');
  if(typeof content !== 'string') throw new Error('trackModel: content must be a string');
  const createdAt = new Date().toISOString();
  const tokenEstimate = estimateTokens(content, false);
  return {model: modelName.trim(), createdAt, updatedAt: createdAt, tokenEstimate};
}

// --- end metadata utilities ---

function loadPrompts(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw){
      prompts = [];
      recentlyDeletedNotes = [];
      return;
    }
    const parsed = JSON.parse(raw);
    // migration: legacy stored array -> wrap it
    if(Array.isArray(parsed)){
      prompts = parsed;
      recentlyDeletedNotes = [];
    }else{
      prompts = parsed.prompts || [];
      recentlyDeletedNotes = parsed.recentlyDeletedNotes || [];
    }
    // ensure older prompts have a rating field, notes array, and metadata
    prompts = prompts.map(p => {
      const base = Object.assign({rating: null, notes: []}, p);
      if(!base.metadata){
        try{
          const created = base.createdAt || new Date().toISOString();
          const createdIso = (new Date(created)).toISOString();
          const tokenEstimate = estimateTokens(base.content || '', false);
          base.metadata = {model: 'unknown', createdAt: createdIso, updatedAt: createdIso, tokenEstimate};
        }catch(err){
          base.metadata = {model: 'unknown', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), tokenEstimate: {min:0,max:0,confidence:'low'}};
        }
      } else {
        try{
          if(!isValidISODate(base.metadata.createdAt)) base.metadata.createdAt = new Date().toISOString();
          if(!isValidISODate(base.metadata.updatedAt)) base.metadata.updatedAt = base.metadata.createdAt;
        }catch(e){ base.metadata.createdAt = new Date().toISOString(); base.metadata.updatedAt = base.metadata.createdAt; }
      }
      return base;
    });
  }catch(e){
    console.error('Failed to load prompts', e);
    prompts = [];
    recentlyDeletedNotes = [];
  }
}

function savePrompts(){
  try{
    const payload = {prompts, recentlyDeletedNotes};
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return true;
  }catch(err){
    console.error('Failed to save prompts', err);
    showToast('Unable to save prompts (storage may be disabled)');
    return false;
  }
}

function showToast(msg, ms = 1800){
  if(!toastEl) return;
  toastEl.textContent = msg;
  toastEl.style.display = '';
  setTimeout(()=> { toastEl.style.display = 'none'; }, ms);
}

// --- Export / Import utilities ---
function createPromptId(){
  return (crypto && crypto.randomUUID) ? crypto.randomUUID() : (Date.now() + '-' + Math.random().toString(36).slice(2,8));
}

function computeStats(list){
  const totalPrompts = list.length;
  const ratings = list.map(p => (p.rating == null ? null : Number(p.rating))).filter(r => r != null && !isNaN(r));
  const averageRating = ratings.length ? Number((ratings.reduce((a,b)=>a+b,0)/ratings.length).toFixed(2)) : null;
  const modelCounts = {};
  list.forEach(p => {
    const m = (p.metadata && p.metadata.model) ? String(p.metadata.model) : 'unknown';
    modelCounts[m] = (modelCounts[m] || 0) + 1;
  });
  let mostUsedModel = null;
  let max = 0;
  Object.keys(modelCounts).forEach(m => { if(modelCounts[m] > max){ max = modelCounts[m]; mostUsedModel = m; } });
  return {totalPrompts, averageRating, mostUsedModel};
}

function downloadJSON(obj, filename){
  const blob = new Blob([JSON.stringify(obj, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=> URL.revokeObjectURL(url), 5000);
}

function validateISO(s){ try{ return isValidISODate(s); }catch(e){ return false; } }

function validateImportStructure(obj){
  if(!obj || typeof obj !== 'object') throw new Error('Import: root must be an object');
  if(!obj.version || typeof obj.version !== 'string') throw new Error('Import: missing version');
  if(!obj.exportedAt || !validateISO(obj.exportedAt)) throw new Error('Import: exportedAt missing or invalid');
  if(!Array.isArray(obj.prompts)) throw new Error('Import: prompts must be an array');
  // validate each prompt minimally
  obj.prompts.forEach((p, idx) => {
    if(!p || typeof p !== 'object') throw new Error(`Import: prompt at index ${idx} is not an object`);
    if(!p.id || typeof p.id !== 'string') throw new Error(`Import: prompt at index ${idx} missing id`);
    if(!p.content || typeof p.content !== 'string') throw new Error(`Import: prompt at index ${idx} missing content`);
    if(p.metadata){
      if(!p.metadata.createdAt || !validateISO(p.metadata.createdAt)) throw new Error(`Import: prompt ${p.id} has invalid metadata.createdAt`);
      if(!p.metadata.updatedAt || !validateISO(p.metadata.updatedAt)) throw new Error(`Import: prompt ${p.id} has invalid metadata.updatedAt`);
    }
  });
  return true;
}

async function exportPrompts(){
  try{
    const payload = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      stats: computeStats(prompts),
      prompts: prompts
    };
    const fname = `prompts-export-${(new Date()).toISOString().replace(/[:.]/g,'-')}.json`;
    downloadJSON(payload, fname);
    showToast('Export started');
  }catch(e){
    console.error('Export failed', e);
    showToast('Export failed: ' + (e.message || 'unknown'));
  }
}

function readFileAsText(file){
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(new Error('Failed to read file'));
    r.onload = () => resolve(String(r.result));
    r.readAsText(file);
  });
}

function showImportDialog(parsed){
  return new Promise(resolve => {
    if(importFileName) importFileName.textContent = `File: ${parsed.fileName} — ${parsed.prompts.length} prompts`;
    // show/hide duplicate options
    const existingIds = new Set(prompts.map(p=>p.id));
    const hasDup = parsed.prompts.some(p => existingIds.has(p.id));
    const dupOptions = document.getElementById('dup-options');
    if(dupOptions) dupOptions.style.display = hasDup ? '' : 'none';
    importModal.classList.remove('hidden');
    const onCancel = () => { cleanup(); resolve(null); };
    const onOk = () => {
      const fm = new FormData(importOptionsForm);
      const mode = fm.get('mode') || 'merge';
      const dup = fm.get('dup') || 'skip';
      cleanup();
      resolve({mode, dup});
    };
    function cleanup(){
      importModal.classList.add('hidden');
      importOk.removeEventListener('click', onOk);
      importCancel.removeEventListener('click', onCancel);
    }
    importOk.addEventListener('click', onOk);
    importCancel.addEventListener('click', onCancel);
  });
}

async function handleFileImport(file){
  if(!file) return;
  let txt;
  try{ txt = await readFileAsText(file); }catch(e){ showToast('Unable to read file'); return; }
  let parsed;
  try{ parsed = JSON.parse(txt); }catch(e){ showToast('Invalid JSON file'); return; }
  try{ validateImportStructure(parsed); }catch(e){ showToast('Import validation failed: ' + e.message); return; }
  // attach filename for dialog
  parsed.fileName = file.name || 'import.json';
  const choice = await showImportDialog(parsed);
  if(!choice){ showToast('Import cancelled'); return; }

  // backup current storage
  const prevRaw = localStorage.getItem(STORAGE_KEY) || '';
  const backupKey = STORAGE_KEY + '.backup.' + (new Date()).toISOString();
  try{ localStorage.setItem(backupKey, prevRaw); }catch(e){ console.warn('Could not write backup to localStorage', e); }

  try{
    if(choice.mode === 'replace'){
      const payload = {prompts: parsed.prompts || [], recentlyDeletedNotes: []};
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      loadPrompts(); renderPrompts(); showToast('Import complete (replaced)');
      return;
    }

    // merge
    const existingById = new Map(prompts.map(p=>[p.id,p]));
    const newList = prompts.slice();
    for(const imp of parsed.prompts){
      if(existingById.has(imp.id)){
        if(choice.dup === 'skip') continue;
        if(choice.dup === 'replace'){
          const idx = newList.findIndex(x=>x.id===imp.id);
          if(idx !== -1) newList[idx] = imp; else newList.push(imp);
          continue;
        }
        if(choice.dup === 'newid'){
          let nid = createPromptId();
          while(newList.some(x=>x.id===nid)) nid = createPromptId();
          imp.id = nid;
          newList.push(imp);
          continue;
        }
      }else{
        newList.push(imp);
      }
    }
    // persist
    localStorage.setItem(STORAGE_KEY, JSON.stringify({prompts: newList, recentlyDeletedNotes}));
    loadPrompts(); renderPrompts(); showToast('Import complete (merged)');
  }catch(e){
    console.error('Import failed, attempting rollback', e);
    try{ if(prevRaw) localStorage.setItem(STORAGE_KEY, prevRaw); loadPrompts(); renderPrompts(); }catch(err){ console.error('Rollback failed', err); }
    showToast('Import failed — changes rolled back');
  }
}

// --- end import/export utilities ---

function makeNodeFromPrompt(p){
  const node = template.content.cloneNode(true);
  const title = node.querySelector('.prompt-title');
  const content = node.querySelector('.prompt-content');
  const copyBtn = node.querySelector('[data-action="copy"]');
  const deleteBtn = node.querySelector('[data-action="delete"]');
  const ratingWrap = node.querySelector('.prompt-rating');
  const notesList = node.querySelector('.notes-list');
  const noteEditor = node.querySelector('.note-editor');
  const noteTextarea = node.querySelector('.note-text');
  const noteAddBtn = node.querySelector('[data-action="note-add"]');

  title.textContent = p.title || '(Untitled)';
  content.textContent = p.content;
  if(copyBtn) copyBtn.dataset.id = p.id;
  if(deleteBtn) deleteBtn.dataset.id = p.id;
  if(noteAddBtn) noteAddBtn.dataset.id = p.id;

  // render 5-star rating buttons
  if(ratingWrap){
    for(let i=1;i<=5;i++){
      const star = document.createElement('button');
      star.type = 'button';
      star.className = 'star' + (p.rating && i <= p.rating ? ' filled' : '');
      star.dataset.action = 'rate';
      star.dataset.id = p.id;
      star.dataset.value = String(i);
      star.setAttribute('role','radio');
      star.setAttribute('aria-checked', String(p.rating === i));
      star.setAttribute('aria-label', `${i} star${i>1?'s':''}`);
      star.innerHTML = i <= (p.rating || 0) ? '★' : '☆';
      ratingWrap.appendChild(star);
    }
  }
  // render notes
  if(Array.isArray(p.notes) && notesList){
    const noteTemplate = document.getElementById('note-template');
    notesList.innerHTML = '';
    p.notes.forEach(n => {
      const nn = noteTemplate.content.cloneNode(true);
      const item = nn.querySelector('.note-item');
      const contentEl = nn.querySelector('.note-content');
      const ts = nn.querySelector('.note-timestamp');
      const editBtn = nn.querySelector('[data-action="note-edit"]');
      const delBtn = nn.querySelector('[data-action="note-delete"]');
      item.dataset.noteId = n.id;
      contentEl.textContent = n.content;
      ts.textContent = new Date(n.updatedAt || n.createdAt).toLocaleString();
      if(editBtn) editBtn.dataset.id = p.id, editBtn.dataset.noteId = n.id;
      if(delBtn) delBtn.dataset.id = p.id, delBtn.dataset.noteId = n.id;
      notesList.appendChild(nn);
    });
  }

  // ensure editor textarea cleared and associated to prompt
  if(noteEditor && noteTextarea){
    noteTextarea.value = '';
    noteEditor.classList.add('hidden');
    noteTextarea.dataset.promptId = p.id;
  }
  // populate metadata display if present in template
  try{
    const metaModel = node.querySelector('.meta-model');
    const metaTimestamps = node.querySelector('.meta-timestamps');
    const metaTokens = node.querySelector('.meta-tokens');
    if(metaModel) metaModel.textContent = p.metadata && p.metadata.model ? String(p.metadata.model) : 'unknown';
    if(metaTimestamps){
      const created = p.metadata && p.metadata.createdAt ? new Date(p.metadata.createdAt).toLocaleString() : (p.createdAt ? new Date(p.createdAt).toLocaleString() : '');
      const updated = p.metadata && p.metadata.updatedAt ? new Date(p.metadata.updatedAt).toLocaleString() : '';
      metaTimestamps.textContent = created === updated ? created : `${created} • ${updated}`;
    }
    if(metaTokens && p.metadata && p.metadata.tokenEstimate){
      const te = p.metadata.tokenEstimate;
      metaTokens.textContent = `${te.min}–${te.max} tokens`;
      metaTokens.classList.remove('confidence-high','confidence-medium','confidence-low');
      metaTokens.classList.add('confidence-' + (te.confidence || 'low'));
    }
  }catch(e){}
  return node;
}

function createNoteId(){
  return (crypto && crypto.randomUUID) ? crypto.randomUUID() : ('note-' + Date.now() + '-' + Math.random().toString(36).slice(2,8));
}

function addNote(promptId, content){
  const p = prompts.find(x => x.id === promptId);
  if(!p) return;
  if(!p.notes) p.notes = [];
  const now = new Date().toISOString();
  const note = {id: createNoteId(), content: content.trim(), createdAt: now, updatedAt: now};
  p.notes.push(note);
  try{ p.metadata = updateTimestamps(p.metadata); }catch(e){}
  savePrompts();
  renderPrompts();
  showToast('Note saved');
}

function updateNote(promptId, noteId, newContent){
  const p = prompts.find(x => x.id === promptId);
  if(!p || !p.notes) return;
  const n = p.notes.find(x => x.id === noteId);
  if(!n) return;
  n.content = newContent.trim();
  n.updatedAt = new Date().toISOString();
  try{ p.metadata = updateTimestamps(p.metadata); }catch(e){}
  savePrompts();
  renderPrompts();
  showToast('Note updated');
}

async function handleDeleteNote(promptId, noteId){
  const ok = await showConfirm('Delete this note? It will be moved to Recently Deleted.');
  if(!ok) return;
  const p = prompts.find(x => x.id === promptId);
  if(!p || !p.notes) return;
  const idx = p.notes.findIndex(x => x.id === noteId);
  if(idx === -1) return;
  const [removed] = p.notes.splice(idx,1);
  // add to recentlyDeletedNotes
  recentlyDeletedNotes.unshift({promptId, note: removed, deletedAt: new Date().toISOString()});
  if(recentlyDeletedNotes.length > 5) recentlyDeletedNotes.pop();
  try{ p.metadata = updateTimestamps(p.metadata); }catch(e){}
  savePrompts();
  renderPrompts();
  showToast('Note deleted (recent)');
}

function setRating(id, value){
  const p = prompts.find(x => x.id === id);
  if(!p) return;
  const num = value === null ? null : Number(value);
  if(p.rating === num) p.rating = null;
  else p.rating = num;
  try{ p.metadata = updateTimestamps(p.metadata); }catch(e){}
  savePrompts();
  renderPrompts();
  if(p.rating) showToast(`Rated ${p.rating} star${p.rating>1?'s':''}`);
  else showToast('Rating cleared');
}

function renderPrompts(){
  promptsList.innerHTML = '';
  if(!prompts || prompts.length === 0){
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = 'No saved prompts yet. Create one using the form.';
    promptsList.appendChild(empty);
    countEl.textContent = '0';
    return;
  }

  // apply sorting/filter
  let list = prompts.slice();
  if(sortMode === 'top'){
    list.sort((a,b) => {
      const ra = a.rating || 0;
      const rb = b.rating || 0;
      if(rb !== ra) return rb - ra;
      const da = (a.metadata && a.metadata.createdAt) || a.createdAt;
      const db = (b.metadata && b.metadata.createdAt) || b.createdAt;
      return new Date(db) - new Date(da);
    });
  }else{
    list.sort((a,b) => {
      const da = (a.metadata && a.metadata.createdAt) || a.createdAt;
      const db = (b.metadata && b.metadata.createdAt) || b.createdAt;
      return new Date(db) - new Date(da);
    });
  }

  countEl.textContent = String(list.length);

  const frag = document.createDocumentFragment();
  list.forEach(p => {
    frag.appendChild(makeNodeFromPrompt(p));
  });
  promptsList.appendChild(frag);
}

function handleDeleteConfirmed(id){
  prompts = prompts.filter(p => p.id !== id);
  savePrompts();
  renderPrompts();
  showToast('Prompt deleted');
}

function showConfirm(message){
  return new Promise(resolve => {
    confirmMessage.textContent = message;
    confirmModal.classList.remove('hidden');
    const onOk = () => { cleanup(); resolve(true); };
    const onCancel = () => { cleanup(); resolve(false); };
    function cleanup(){
      confirmModal.classList.add('hidden');
      confirmOk.removeEventListener('click', onOk);
      confirmCancel.removeEventListener('click', onCancel);
    }
    confirmOk.addEventListener('click', onOk);
    confirmCancel.addEventListener('click', onCancel);
  });
}

async function handleDelete(id){
  const ok = await showConfirm('Delete this prompt? This action cannot be undone.');
  if(!ok) return;
  handleDeleteConfirmed(id);
}

function addPrompt(title, content, model){
  const id = (crypto && crypto.randomUUID) ? crypto.randomUUID() : (Date.now() + '-' + Math.random().toString(36).slice(2,8));
  let metadata = null;
  try{
    metadata = trackModel(model || 'unknown', content);
  }catch(e){
    metadata = {model:'unknown', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), tokenEstimate:{min:0,max:0,confidence:'low'}};
  }
  prompts.push({id, title, content, rating: null, notes: [], createdAt: metadata.createdAt, metadata});
  savePrompts();
  renderPrompts();
  showToast('Prompt saved');
}

function handleCopy(id, button){
  const p = prompts.find(x => x.id === id);
  if(!p) return;
  navigator.clipboard && navigator.clipboard.writeText(p.content).then(()=>{
    if(button) {
      const prev = button.textContent;
      button.textContent = 'Copied';
      setTimeout(()=> button.textContent = prev, 1200);
    }
    showToast('Copied to clipboard');
  }).catch(()=>{
    showToast('Unable to copy to clipboard');
  });
}

// Event delegation for prompt actions
promptsList.addEventListener('click', (e)=>{
  const btn = e.target.closest('button[data-action]');
  if(!btn) return;
  const action = btn.dataset.action;
  const id = btn.dataset.id; // prompt id for many note buttons

  // Rating
  if(action === 'rate'){
    const value = btn.dataset.value;
    setRating(id, value);
    return;
  }

  // Copy or prompt delete
  if(action === 'copy') { handleCopy(id, btn); return; }
  if(action === 'delete') { handleDelete(id); return; }

  // Notes: add / cancel (editor) / save (editor or inline) / edit / edit-cancel / delete
  if(action === 'note-add'){
    const promptItem = btn.closest('.prompt-item');
    const editor = promptItem && promptItem.querySelector('.note-editor');
    const ta = editor && editor.querySelector('.note-text');
    if(editor && ta){ editor.classList.remove('hidden'); ta.focus(); }
    return;
  }

  if(action === 'note-cancel'){
    const editor = btn.closest('.note-editor');
    if(editor){ editor.classList.add('hidden'); const ta = editor.querySelector('.note-text'); if(ta) ta.value = ''; }
    return;
  }

  if(action === 'note-save'){
    // if this is an inline note save it will have dataset.noteId, otherwise it's from the new-note editor
    const noteId = btn.dataset.noteId;
    if(noteId){
      const noteItem = btn.closest('.note-item');
      const ta = noteItem && (noteItem.querySelector('textarea.note-editing') || noteItem.querySelector('textarea'));
      if(ta) updateNote(btn.dataset.id, noteId, ta.value);
    }else{
      const editor = btn.closest('.note-editor');
      if(!editor) return;
      const ta = editor.querySelector('.note-text');
      const promptId = ta.dataset.promptId || btn.dataset.id;
      if(ta && ta.value.trim()) addNote(promptId, ta.value);
      editor.classList.add('hidden');
      if(ta) ta.value = '';
    }
    return;
  }

  if(action === 'note-edit'){
    const promptId = btn.dataset.id;
    const noteId = btn.dataset.noteId;
    const noteItem = btn.closest('.note-item');
    if(!noteItem) return;
    const contentEl = noteItem.querySelector('.note-content');
    const old = contentEl.textContent || '';
    const ta = document.createElement('textarea');
    ta.className = 'note-editing';
    ta.rows = 3;
    ta.value = old;
    contentEl.innerHTML = '';
    contentEl.appendChild(ta);
    // turn edit button into save
    btn.dataset.action = 'note-save';
    btn.dataset.id = promptId;
    btn.dataset.noteId = noteId;
    btn.textContent = 'Save';
    // add cancel button if missing
    let cancelBtn = noteItem.querySelector('[data-action="note-edit-cancel"]');
    if(!cancelBtn){
      cancelBtn = document.createElement('button');
      cancelBtn.className = 'btn small ghost';
      cancelBtn.dataset.action = 'note-edit-cancel';
      cancelBtn.dataset.id = promptId;
      cancelBtn.dataset.noteId = noteId;
      cancelBtn.textContent = 'Cancel';
      const controls = noteItem.querySelector('.note-controls');
      controls.appendChild(cancelBtn);
    }
    ta.focus();
    return;
  }

  if(action === 'note-edit-cancel'){
    // re-render to restore original note content
    renderPrompts();
    return;
  }

  if(action === 'note-delete'){
    const promptId = btn.dataset.id;
    const noteId = btn.dataset.noteId;
    handleDeleteNote(promptId, noteId);
    return;
  }
});

// Hover preview for rating (delegated)
promptsList.addEventListener('mouseover', (e)=>{
  const star = e.target.closest('button[data-action="rate"]');
  if(!star) return;
  const wrap = star.parentElement;
  const val = Number(star.dataset.value);
  wrap.querySelectorAll('.star').forEach(s => {
    const v = Number(s.dataset.value);
    if(v <= val) s.classList.add('preview'); else s.classList.remove('preview');
  });
});
promptsList.addEventListener('mouseout', (e)=>{
  const star = e.target.closest('button[data-action="rate"]');
  if(!star) return;
  const wrap = star.parentElement;
  wrap.querySelectorAll('.star').forEach(s => s.classList.remove('preview'));
});

// Keyboard support for stars
promptsList.addEventListener('keydown', (e)=>{
  const star = e.target.closest('button[data-action="rate"]');
  if(!star) return;
  const wrap = star.parentElement;
  const stars = Array.from(wrap.querySelectorAll('.star'));
  const idx = stars.indexOf(star);
  if(e.key === 'ArrowRight' || e.key === 'ArrowUp'){
    const next = stars[(idx + 1) % stars.length];
    next.focus();
    e.preventDefault();
  }else if(e.key === 'ArrowLeft' || e.key === 'ArrowDown'){
    const prev = stars[(idx - 1 + stars.length) % stars.length];
    prev.focus();
    e.preventDefault();
  }else if(e.key === 'Enter' || e.key === ' '){
    setRating(star.dataset.id, star.dataset.value);
    e.preventDefault();
  }
});

// Sort control
if(sortSelect){
  sortSelect.addEventListener('change', (e)=>{
    sortMode = sortSelect.value === 'top' ? 'top' : 'newest';
    renderPrompts();
  });
}

form.addEventListener('submit', (e)=>{
  e.preventDefault();
  const title = titleInput.value.trim();
  const content = contentInput.value.trim();
  const model = (modelInput && modelInput.value) ? modelInput.value.trim() : '';
  if(!content){
    showToast('Please enter prompt content.');
    return;
  }
  try{
    if(!model) throw new Error('Please enter a model name.');
    if(model.length > 100) throw new Error('Model name must be 100 characters or fewer.');
    addPrompt(title || '(Untitled)', content, model);
    form.reset();
    titleInput.focus();
  }catch(err){
    showToast(err.message || 'Invalid model name');
  }
});

clearFormBtn.addEventListener('click', ()=> form.reset());

// init
loadPrompts();
renderPrompts();

// bind import/export UI
if(exportBtn) exportBtn.addEventListener('click', exportPrompts);
if(importBtn) importBtn.addEventListener('click', ()=> { if(importFileInput) importFileInput.click(); });
if(importFileInput) importFileInput.addEventListener('change', (e)=>{
  const f = (e.target && e.target.files && e.target.files[0]) ? e.target.files[0] : null;
  if(f) handleFileImport(f);
  // clear selection so same file can be re-imported if needed
  if(importFileInput) importFileInput.value = '';
});
