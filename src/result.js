import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { marked } from 'marked';
import mermaid from 'mermaid';
import { SCANS_DIR } from './constants.js';
import { showSection, showToast } from './ui.js';

export let lastMarkdown = '';
export let lastMdFile   = '';

export async function showResult(filename, mdFile, markdown) {
  lastMarkdown = markdown;
  lastMdFile   = mdFile;
  document.getElementById('resultFilename').textContent = mdFile;

  const content = document.getElementById('resultContent');
  const html = marked.parse(markdown)
    .replace(/<li>\[ \]/g,  '<li><input type="checkbox" disabled>')
    .replace(/<li>\[x\]/gi, '<li><input type="checkbox" disabled checked>');
  content.innerHTML = html;

  const mermaidBlocks = content.querySelectorAll('code.language-mermaid');
  for (const [i, block] of [...mermaidBlocks].entries()) {
    const graphDef = block.textContent.replace(/<br\s*\/?>/gi, ' ');
    const id = `mermaid-${Date.now()}-${i}`;
    try {
      const { svg } = await mermaid.render(id, graphDef);
      const div = document.createElement('div');
      div.className = 'mermaid';
      div.innerHTML = svg;
      block.parentElement.replaceWith(div);
    } catch {
      const pre = document.createElement('pre');
      pre.textContent = graphDef;
      block.parentElement.replaceWith(pre);
    }
  }

  document.getElementById('nav-result').classList.add('has-result');
  showSection('result');
}

export function copyResult() {
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(lastMarkdown).then(() => showToast('Copied to clipboard!', 'success'));
  } else {
    const ta = document.createElement('textarea');
    ta.value = lastMarkdown;
    ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
    document.body.appendChild(ta);
    ta.focus(); ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('Copied to clipboard!', 'success');
  }
}

export function downloadResult() {
  const blob = new Blob([lastMarkdown], { type: 'text/markdown' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = lastMdFile || 'scan.md';
  a.click();
}

export async function saveTodayResult() {
  if (!lastMarkdown) return;
  const now  = new Date();
  const dd   = String(now.getDate()).padStart(2, '0');
  const mm   = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  const filename = `${dd}-${mm}-${yyyy}.md`;
  try {
    await Filesystem.writeFile({
      path: `${SCANS_DIR}/${filename}`,
      data: lastMarkdown,
      directory: Directory.Data,
      encoding: Encoding.UTF8,
    });
    lastMdFile = filename;
    document.getElementById('resultFilename').textContent = filename;
    showToast(`Saved as ${filename}`, 'success');
    window.loadNotes?.();
  } catch (e) {
    showToast('Save failed: ' + e.message, 'error');
  }
}

window.copyResult      = copyResult;
window.downloadResult  = downloadResult;
window.saveTodayResult = saveTodayResult;
