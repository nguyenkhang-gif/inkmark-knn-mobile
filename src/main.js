import { marked } from 'marked';
import mermaid from 'mermaid';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { IMGS_DIR, SCANS_DIR } from './constants.js';
import { showSection, switchInputTab, showToast } from './ui.js';
import { ensureDirs } from './filesystem.js';
import { loadSettings, loadPaths, getApiKey } from './settings.js';
import { loadGallery } from './gallery.js';
import { loadNotes } from './notes.js';
import './camera.js';
import './scan.js';
import './result.js';
import './style.css';

// ── Markdown / Mermaid setup ───────────────────────────────────────────────
mermaid.initialize({
  startOnLoad: false, theme: 'dark', securityLevel: 'loose', useMaxWidth: true,
  themeVariables: {
    primaryColor: '#1e3a5f', primaryTextColor: '#e2e8f0', primaryBorderColor: '#334155',
    lineColor: '#64748b', secondaryColor: '#0f172a', tertiaryColor: '#1e293b',
    background: '#0f172a', mainBkg: '#1e293b', nodeBorder: '#334155',
    clusterBkg: '#1e293b', titleColor: '#94a3b8', edgeLabelBackground: '#1e293b',
    fontFamily: 'ui-monospace, monospace',
  },
  flowchart: { htmlLabels: false, curve: 'basis' },
});
marked.setOptions({ breaks: true, gfm: true });

// ── Navigation globals ────────────────────────────────────────────────────
window.showSection    = showSection;
window.switchInputTab = switchInputTab;

// ── Clear all data ────────────────────────────────────────────────────────
window.clearAllData = async function() {
  if (!confirm('Delete all images and notes? This cannot be undone.')) return;
  try {
    const { files: imgs }  = await Filesystem.readdir({ path: IMGS_DIR,  directory: Directory.Data }).catch(() => ({ files: [] }));
    const { files: scans } = await Filesystem.readdir({ path: SCANS_DIR, directory: Directory.Data }).catch(() => ({ files: [] }));
    await Promise.all([
      ...imgs.map(f  => Filesystem.deleteFile({ path: `${IMGS_DIR}/${f.name  || f}`, directory: Directory.Data })),
      ...scans.map(f => Filesystem.deleteFile({ path: `${SCANS_DIR}/${f.name || f}`, directory: Directory.Data })),
    ]);
    showToast('All data cleared', 'success');
    loadGallery();
    loadNotes();
  } catch (e) {
    showToast('Error clearing data: ' + e.message, 'error');
  }
};

// ── Init ──────────────────────────────────────────────────────────────────
async function initApp() {
  loadPaths();
  await ensureDirs();
  await loadSettings();
  const apiKey = await getApiKey();
  if (!apiKey) {
    showToast('Welcome! Set your Gemini API key in Settings.', '');
    showSection('settings');
  } else {
    switchInputTab('upload');
    loadGallery();
    loadNotes();
  }
}

document.addEventListener('DOMContentLoaded', initApp);
