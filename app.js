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

function loadPrompts(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    prompts = raw ? JSON.parse(raw) : [];
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

  title.textContent = p.title || '(Untitled)';
  content.textContent = p.content;
  if(copyBtn) copyBtn.dataset.id = p.id;
  if(deleteBtn) deleteBtn.dataset.id = p.id;
  return node;
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

  countEl.textContent = String(prompts.length);

  const frag = document.createDocumentFragment();
  prompts.slice().reverse().forEach(p => {
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
  prompts.push({id, title, content, createdAt: new Date().toISOString()});
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
  if(action === 'copy') handleCopy(id, btn);
  if(action === 'delete') handleDelete(id);
});

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
