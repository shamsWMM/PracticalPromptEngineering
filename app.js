// Prompt Library app.js (modernized module)
// Storage structure migrated to an object so we can keep prompts and recentlyDeletedNotes together.
const STORAGE_KEY = 'promptLibrary.data';

const $ = s => document.querySelector(s);

const form = $('#prompt-form');
const titleInput = $('#title');
const contentInput = $('#content');
const promptsList = $('#prompts-list');
const countEl = $('#count');
const clearFormBtn = $('#clear-form');
const toastEl = $('#toast');

const confirmModal = $('#confirm-modal');
const confirmMessage = $('#confirm-message');
const confirmOk = $('#confirm-ok');
const confirmCancel = $('#confirm-cancel');

const template = $('#prompt-template');

let prompts = [];
let recentlyDeletedNotes = []; // buffer of recently deleted notes (max 5)
let sortMode = 'newest';
const sortSelect = $('#sort-select');

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
    // ensure older prompts have a rating field and notes array
    prompts = prompts.map(p => Object.assign({rating: null, notes: []}, p));
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
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }else{
    list.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
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

function addPrompt(title, content){
  const id = (crypto && crypto.randomUUID) ? crypto.randomUUID() : (Date.now() + '-' + Math.random().toString(36).slice(2,8));
  prompts.push({id, title, content, rating: null, notes: [], createdAt: new Date().toISOString()});
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
  if(!content){
    showToast('Please enter prompt content.');
    return;
  }
  addPrompt(title || '(Untitled)', content);
  form.reset();
  titleInput.focus();
});

clearFormBtn.addEventListener('click', ()=> form.reset());

// init
loadPrompts();
renderPrompts();
