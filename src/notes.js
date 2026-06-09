import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { SCANS_DIR } from './constants.js';
import { showToast } from './ui.js';
import { showResult } from './result.js';

function formatNoteDate(filename) {
  const match = filename.match(/scan_(\d+)/);
  if (!match) return '';
  try {
    return new Date(parseInt(match[1])).toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch { return ''; }
}

export async function loadNotes() {
  let files = [];
  try {
    const { files: raw } = await Filesystem.readdir({ path: SCANS_DIR, directory: Directory.Data });
    files = raw.map(f => f.name || f).filter(n => n.endsWith('.md')).sort().reverse();
  } catch { /* empty */ }

  const list = document.getElementById('notesList');
  if (!files.length) {
    list.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
        <p>No notes yet</p>
        <small>Scan an image to create your first note</small>
      </div>`;
    return;
  }

  list.innerHTML = files.map(f => `
    <div class="note-item" id="note-${f}" onclick="openNote('${f}')">
      <span class="note-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
      </span>
      <div class="note-info" id="note-info-${f}">
        <div class="note-name">${f.replace('.md', '')}</div>
        ${formatNoteDate(f) ? `<div class="note-date">${formatNoteDate(f)}</div>` : ''}
      </div>
      <div class="note-actions">
        <button class="note-rename" onclick="event.stopPropagation(); startRename('${f}')">✏</button>
        <button class="note-del" onclick="event.stopPropagation(); deleteNote('${f}')">Del</button>
      </div>
    </div>
  `).join('');
}

export async function openNote(filename) {
  const { data: markdown } = await Filesystem.readFile({
    path: `${SCANS_DIR}/${filename}`,
    directory: Directory.Data,
    encoding: Encoding.UTF8,
  });
  showResult(filename, filename, markdown);
}

export async function deleteNote(filename) {
  if (!confirm(`Delete ${filename}?`)) return;
  await Filesystem.deleteFile({ path: `${SCANS_DIR}/${filename}`, directory: Directory.Data });
  showToast(`Deleted ${filename.replace('.md', '')}`);
  loadNotes();
}

export function startRename(filename) {
  const infoEl = document.getElementById(`note-info-${filename}`);
  if (!infoEl) return;
  const current = filename.replace('.md', '');
  const now = new Date();
  const today = `${String(now.getDate()).padStart(2,'0')}-${String(now.getMonth()+1).padStart(2,'0')}-${now.getFullYear()}`;
  infoEl.innerHTML = `
    <input class="rename-input" id="rename-${filename}" value="${current}"
      onkeydown="if(event.key==='Enter'){event.preventDefault();confirmRename('${filename}')}
                 if(event.key==='Escape') loadNotes()" />
    <div class="rename-btns">
      <button class="rename-today" onclick="event.stopPropagation();document.getElementById('rename-${filename}').value='${today}'" title="Rename to today">${today}</button>
      <button class="rename-ok"     onclick="event.stopPropagation();confirmRename('${filename}')">✓</button>
      <button class="rename-cancel" onclick="event.stopPropagation();loadNotes()">✕</button>
    </div>`;
  const input = document.getElementById(`rename-${filename}`);
  input.focus();
  input.select();
  document.getElementById(`note-${filename}`).onclick = null;
}

export async function confirmRename(oldFilename) {
  const input = document.getElementById(`rename-${oldFilename}`);
  if (!input) return;
  const raw = input.value.trim().replace(/[/\\]/g, '_');
  if (!raw) { loadNotes(); return; }
  const newFilename = raw.endsWith('.md') ? raw : `${raw}.md`;
  if (newFilename === oldFilename) { loadNotes(); return; }
  try {
    const { data } = await Filesystem.readFile({
      path: `${SCANS_DIR}/${oldFilename}`, directory: Directory.Data, encoding: Encoding.UTF8,
    });
    await Filesystem.writeFile({
      path: `${SCANS_DIR}/${newFilename}`, data, directory: Directory.Data, encoding: Encoding.UTF8,
    });
    await Filesystem.deleteFile({ path: `${SCANS_DIR}/${oldFilename}`, directory: Directory.Data });
    showToast(`Renamed to ${newFilename.replace('.md', '')}`, 'success');
  } catch (e) {
    showToast('Rename failed: ' + e.message, 'error');
  }
  loadNotes();
}

window.loadNotes     = loadNotes;
window.openNote      = openNote;
window.deleteNote    = deleteNote;
window.startRename   = startRename;
window.confirmRename = confirmRename;
