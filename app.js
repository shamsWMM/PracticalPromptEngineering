// Prompt Library app.js (modernized module)
const STORAGE_KEY = 'promptLibrary.prompts';

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
let sortMode = 'newest';
const sortSelect = $('#sort-select');

function loadPrompts(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    prompts = raw ? JSON.parse(raw) : [];
    // ensure older prompts have a rating field
    prompts = prompts.map(p => (typeof p.rating === 'undefined') ? Object.assign({}, p, {rating: null}) : p);
  }catch(e){
    console.error('Failed to load prompts', e);
    prompts = [];
  }
}

function savePrompts(){
  try{
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prompts));
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

  title.textContent = p.title || '(Untitled)';
  content.textContent = p.content;
  if(copyBtn) copyBtn.dataset.id = p.id;
  if(deleteBtn) deleteBtn.dataset.id = p.id;

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
  return node;
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
  prompts.push({id, title, content, rating: null, createdAt: new Date().toISOString()});
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
  const id = btn.dataset.id;
  if(action === 'rate'){
    const value = btn.dataset.value;
    setRating(id, value);
    return;
  }
  if(action === 'copy') handleCopy(id, btn);
  if(action === 'delete') handleDelete(id);
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
