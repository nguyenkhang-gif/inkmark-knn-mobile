const statusEl = document.getElementById('status');
let statusTimer = null;

export function showSection(name) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
  document.getElementById(`sec-${name}`).classList.add('active');
  document.getElementById(`nav-${name}`).classList.add('active');
}

export function switchInputTab(tab) {
  document.querySelectorAll('.input-tab').forEach((t, i) =>
    t.classList.toggle('active', (i === 0) === (tab === 'camera'))
  );
  document.getElementById('cameraSection').classList.toggle('active', tab === 'camera');
  document.getElementById('uploadSection').classList.toggle('active', tab === 'upload');
}

export function setStatus(msg, isError = false) {
  statusEl.textContent = msg;
  statusEl.className = (isError ? 'error' : '') + (msg ? ' visible' : '');
  clearTimeout(statusTimer);
  if (msg) statusTimer = setTimeout(() => statusEl.classList.remove('visible'), 4000);
}

export function showToast(msg, type = '') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast${type ? ' ' + type : ''}`;
  toast.textContent = msg;
  container.appendChild(toast);
  requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('show')));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

export function setScanOverlay(visible) {
  document.getElementById('scanOverlay').classList.toggle('active', visible);
}
