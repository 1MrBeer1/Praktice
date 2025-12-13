// files.js — улучшенный проводник
let currentPath = "/";            // отображаемая директория
let editingPath = null;          // путь файла, который открыт в редакторе

function showAlert(msg) {
  const a = document.getElementById('alert');
  if (!msg) { a.classList.add('d-none'); a.innerText = ''; return; }
  a.innerText = msg; a.classList.remove('d-none');
  setTimeout(()=>{ a.classList.add('d-none'); }, 4000);
}

async function loadFiles(path = null) {
  try {
    if (path) currentPath = path;
    document.getElementById('pathInput').value = currentPath;
    showAlert('');

    const res = await fetch(`/api/files?path=${encodeURIComponent(currentPath)}`);
    const data = await res.json();
    if (data.error) { showAlert(data.error); return; }

    // normalize: backend может давать items или files
    const items = data.items || data.files || data.items || [];
    // normalize path
    currentPath = data.path || currentPath;
    document.getElementById('pathInput').value = currentPath;

    renderBreadcrumbs();
    renderFiles(items);
  } catch (e) {
    showAlert(e.message || String(e));
  }
}

function renderBreadcrumbs() {
  const container = document.getElementById('breadcrumbs');
  const parts = currentPath.split('/').filter(p=>p);
  let html = `<a href="#" onclick="event.preventDefault();go('/')">Root</a>`;
  let accum = '';
  parts.forEach(p=>{
    accum += '/' + p;
    html += ` / <a href="#" onclick="event.preventDefault();go('${accum}')">${p}</a>`;
  });
  container.innerHTML = html;
}

function renderFiles(items) {
  const tbody = document.getElementById('files-body');
  tbody.innerHTML = '';

  // sort: directories first, then files
  items.sort((a, b) => {
    if (a.is_dir !== b.is_dir) return b.is_dir - a.is_dir;
    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
  });

  for (const it of items) {
    const tr = document.createElement('tr');

    const iconTd = document.createElement('td');
    iconTd.innerHTML = it.is_dir ? '📁' : '📄';

    const nameTd = document.createElement('td');
    nameTd.innerHTML = `<span class="ms-2">${escapeHtml(it.name)}</span>`;
    nameTd.style.cursor = 'pointer';
    nameTd.ondblclick = () => {
      if (it.is_dir) go(joinPath(currentPath, it.name));
      else openFile(joinPath(currentPath, it.name));
    };

    const typeTd = document.createElement('td');
    typeTd.innerText = it.is_dir ? 'Folder' : 'File';

    const sizeTd = document.createElement('td');
    sizeTd.innerText = it.is_dir ? '-' : formatSize(it.size || 0);

    const actionsTd = document.createElement('td');
    actionsTd.innerHTML = `
      <button class="btn btn-sm btn-outline-primary me-1"
        onclick="event.stopPropagation(); downloadFile('${encodeURIComponent(joinPath(currentPath, it.name))}')">⬇</button>

      <button class="btn btn-sm btn-outline-danger"
        onclick="event.stopPropagation(); deleteFile('${encodeURIComponent(joinPath(currentPath, it.name))}')">🗑</button>
    `;

    tr.appendChild(iconTd);
    tr.appendChild(nameTd);
    tr.appendChild(typeTd);
    tr.appendChild(sizeTd);
    tr.appendChild(actionsTd);

    tbody.appendChild(tr);
  }
}

function joinPath(dir, name){
  if (dir === '/' || dir === '.' ) return (dir === '/' ? '/' + name : name);
  return dir.endsWith('/') ? dir + name : dir + '/' + name;
}

function go(path) {
  currentPath = path || '/';
  loadFiles(currentPath);
}

function goUp() {
  if (!currentPath || currentPath === '/' || currentPath === '.') return;
  const parts = currentPath.split('/').filter(p=>p);
  parts.pop();
  const newPath = parts.length ? '/' + parts.join('/') : '/';
  go(newPath);
}

function formatSize(bytes) {
  if (bytes >= 1024*1024) return (bytes/1024/1024).toFixed(1) + ' MB';
  if (bytes >= 1024) return (bytes/1024).toFixed(1) + ' KB';
  return bytes + ' B';
}

function escapeHtml(s){
  return (s+'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/* ---------- File actions ---------- */

async function openFile(path) {
  try {
    const res = await fetch(`/api/files/read?path=${encodeURIComponent(path)}`);
    const data = await res.json();
    if (data.error) { showAlert(data.error); return; }

    editingPath = path;
    document.getElementById('editorTitle').innerText = `Edit: ${path}`;
    document.getElementById('editorArea').value = data.content || '';
    document.getElementById('editorModal').classList.remove('d-none');
  } catch (e) { showAlert(e.message); }
}

function closeEditor(){
  editingPath = null;
  document.getElementById('editorModal').classList.add('d-none');
}

async function saveEditor(){
  if (!editingPath) return;
  const content = document.getElementById('editorArea').value;
  const res = await fetch('/api/files/update', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({path: editingPath, content})
  });
  const j = await res.json();
  if (j.error) showAlert(j.error); else { closeEditor(); loadFiles(); }
}

async function deleteFile(encodedPath){
  const path = decodeURIComponent(encodedPath);
  if (!confirm(`Delete ${path}?`)) return;
  const res = await fetch('/api/files/delete', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({path})
  });
  const j = await res.json();
  if (j.error) showAlert(j.error); else loadFiles();
}

function downloadFile(encodedPath){
  const path = decodeURIComponent(encodedPath);
  window.location = `/api/files/download?path=${encodeURIComponent(path)}`;
}

async function newFolder(){
  const name = prompt('Folder name:');
  if (!name) return;
  const res = await fetch('/api/files/folder', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({path: currentPath, name})
  });
  const j = await res.json();
  if (j.error) showAlert(j.error); else loadFiles();
}

async function newFile(){
  const name = prompt('File name:');
  if (!name) return;
  const res = await fetch('/api/files', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({path: currentPath, name, content: ''})
  });
  const j = await res.json();
  if (j.error) showAlert(j.error); else loadFiles();
}

/* Upload via file input */
async function uploadFile(evt){
  const input = evt.target;
  if (!input.files || input.files.length === 0) return;
  for (const f of input.files){
    const fd = new FormData();
    fd.append('file', f);
    fd.append('path', currentPath);
    const res = await fetch('/api/files/upload', {method:'POST', body: fd});
    const j = await res.json();
    if (j.error) showAlert(j.error);
  }
  loadFiles();
}

/* Drag & Drop */
const dropZone = document.getElementById('dropZone');
if (dropZone){
  dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.style.background = '#e9f7ff'; });
  dropZone.addEventListener('dragleave', e => { dropZone.style.background = ''; });
  dropZone.addEventListener('drop', async e => {
    e.preventDefault(); dropZone.style.background = '';
    const files = e.dataTransfer.files;
    for (const f of files) {
      const fd = new FormData();
      fd.append('file', f);
      fd.append('path', currentPath);
      const res = await fetch('/api/files/upload', {method:'POST', body: fd});
      const j = await res.json();
      if (j.error) showAlert(j.error);
    }
    loadFiles();
  });
}

window.addEventListener('DOMContentLoaded', ()=> loadFiles());
