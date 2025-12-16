// Prompt Library app.js
const STORAGE_KEY = 'promptLibrary.prompts';

const form = document.getElementById('prompt-form');
const titleInput = document.getElementById('title');
const contentInput = document.getElementById('content');
const promptsList = document.getElementById('prompts-list');
const countEl = document.getElementById('count');
const clearFormBtn = document.getElementById('clear-form');

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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prompts));
}

function renderPrompts(){
  promptsList.innerHTML = '';
  if(prompts.length === 0){
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = 'No saved prompts yet. Create one using the form.';
    promptsList.appendChild(empty);
    countEl.textContent = '0';
    return;
  }

  countEl.textContent = String(prompts.length);

  // Render each prompt
  prompts.slice().reverse().forEach(p => {
    const item = document.createElement('div');
    item.className = 'prompt-item';

    const meta = document.createElement('div');
    meta.className = 'prompt-meta';

    const title = document.createElement('div');
    title.className = 'prompt-title';
    title.textContent = p.title || '(Untitled)';

    const actions = document.createElement('div');
    actions.className = 'item-actions';

    const copyBtn = document.createElement('button');
    copyBtn.className = 'btn small ghost';
    copyBtn.textContent = 'Copy';
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(p.content).then(()=>{
        copyBtn.textContent = 'Copied';
        setTimeout(()=> copyBtn.textContent = 'Copy', 1200);
      }).catch(()=>{
        alert('Unable to copy to clipboard');
      })
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn small delete';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => handleDelete(p.id));

    actions.appendChild(copyBtn);
    actions.appendChild(deleteBtn);

    meta.appendChild(title);
    meta.appendChild(actions);

    const content = document.createElement('div');
    content.className = 'prompt-content';
    content.textContent = p.content;

    item.appendChild(meta);
    item.appendChild(content);

    promptsList.appendChild(item);
  });
}

function handleDelete(id){
  const ok = confirm('Delete this prompt? This action cannot be undone.');
  if(!ok) return;
  prompts = prompts.filter(p => p.id !== id);
  savePrompts();
  renderPrompts();
}

function addPrompt(title, content){
  const id = Date.now() + '-' + Math.random().toString(36).slice(2,8);
  prompts.push({id, title, content, createdAt: new Date().toISOString()});
  savePrompts();
  renderPrompts();
}

form.addEventListener('submit', (e)=>{
  e.preventDefault();
  const title = titleInput.value.trim();
  const content = contentInput.value.trim();
  if(!content){
    alert('Please enter prompt content.');
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
