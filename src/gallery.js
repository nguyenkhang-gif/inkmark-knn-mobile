import { Filesystem, Directory } from '@capacitor/filesystem';
import { IMGS_DIR, PAGE_LIMIT } from './constants.js';
import { showToast } from './ui.js';
import { getImageSrc } from './filesystem.js';

let currentPage = 1;
export const selectedCells = new Set();

export function updateScanSelectedBtn() {
  const btn = document.getElementById('scanSelectedBtn');
  if (!btn) return;
  const n = selectedCells.size;
  btn.style.display = n > 0 ? 'inline-flex' : 'none';
  btn.textContent = `Scan Selected (${n})`;
}

export async function loadGallery(page = currentPage) {
  currentPage = page;
  const grid = document.getElementById('gallery');
  const pag  = document.getElementById('pagination');

  let allFiles = [];
  try {
    const { files } = await Filesystem.readdir({ path: IMGS_DIR, directory: Directory.Data });
    allFiles = files
      .map(f => f.name || f)
      .filter(n => /\.(jpg|jpeg|png)$/i.test(n))
      .sort()
      .reverse();
  } catch { /* dir may not exist yet */ }

  if (!allFiles.length) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21 15 16 10 5 21"/>
        </svg>
        <p>No images yet</p>
        <small>Go to Scan to add your first image</small>
      </div>`;
    pag.style.display = 'none';
    return;
  }

  const totalPages = Math.ceil(allFiles.length / PAGE_LIMIT);
  const slice = allFiles.slice((page - 1) * PAGE_LIMIT, page * PAGE_LIMIT);

  const cells = await Promise.all(slice.map(async f => {
    const src = await getImageSrc(f);
    return `
      <div class="img-cell" id="cell-${f}" onclick="selectCell('${f}')">
        <img src="${src}" title="${f}" loading="lazy" />
        <div class="actions">
          <button class="scan-btn" onclick="event.stopPropagation(); scanImageNative('${f}', this)">Scan</button>
          <button class="del-btn"  onclick="event.stopPropagation(); deleteImage('${f}')">Del</button>
        </div>
      </div>`;
  }));
  grid.innerHTML = cells.join('');

  for (const f of selectedCells) {
    document.getElementById(`cell-${f}`)?.classList.add('selected');
  }
  updateScanSelectedBtn();

  pag.style.display = totalPages > 1 ? 'flex' : 'none';
  document.getElementById('pageInfo').textContent = `${page} / ${totalPages}`;
  document.getElementById('prevBtn').disabled = page <= 1;
  document.getElementById('nextBtn').disabled = page >= totalPages;
}

export function selectCell(filename) {
  const cell = document.getElementById(`cell-${filename}`);
  if (selectedCells.has(filename)) {
    selectedCells.delete(filename);
    cell.classList.remove('selected');
  } else {
    selectedCells.add(filename);
    cell.classList.add('selected');
  }
  updateScanSelectedBtn();
}

export function changePage(dir) {
  loadGallery(currentPage + dir);
}

export async function deleteAll() {
  if (!confirm('Delete all images? This cannot be undone.')) return;
  try {
    const { files } = await Filesystem.readdir({ path: IMGS_DIR, directory: Directory.Data });
    const imgs = files.map(f => f.name || f).filter(n => /\.(jpg|jpeg|png)$/i.test(n));
    await Promise.all(imgs.map(f => Filesystem.deleteFile({ path: `${IMGS_DIR}/${f}`, directory: Directory.Data })));
    showToast(`Deleted ${imgs.length} image(s)`);
    loadGallery(1);
  } catch (e) {
    showToast('Error: ' + e.message, 'error');
  }
}

export async function deleteImage(filename) {
  if (!confirm(`Delete ${filename}?`)) return;
  await Filesystem.deleteFile({ path: `${IMGS_DIR}/${filename}`, directory: Directory.Data });
  selectedCells.delete(filename);
  showToast(`Deleted ${filename}`);
  loadGallery();
}

window.loadGallery  = loadGallery;
window.selectCell   = selectCell;
window.changePage   = (dir) => changePage(dir);
window.deleteAll    = deleteAll;
window.deleteImage  = deleteImage;
