import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { IMGS_DIR, SCANS_DIR } from './constants.js';
import { setStatus, showToast, setScanOverlay, showSection } from './ui.js';
import { getApiKey } from './settings.js';
import { stripThinking, streamScan } from './api.js';
import { showResult } from './result.js';
import { loadNotes } from './notes.js';
import { selectedCells, updateScanSelectedBtn } from './gallery.js';

window.scanSelected = async function() {
  const files = [...selectedCells];
  if (!files.length) return;

  const apiKey = await getApiKey();
  if (!apiKey) {
    showToast('No API key set — go to Settings', 'error');
    showSection('settings');
    return;
  }

  const parts = [];
  let done = 0, failed = 0;
  setScanOverlay(true);

  for (const filename of files) {
    const idx = done + failed + 1;
    document.querySelector('.scan-overlay-label').textContent = `Scanning ${idx} / ${files.length}`;
    document.querySelector('.scan-overlay-sub').textContent   = filename;
    setStatus(`Scanning ${idx}/${files.length} — ${filename}`);

    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), 120_000);

    try {
      const { data: base64 } = await Filesystem.readFile({ path: `${IMGS_DIR}/${filename}`, directory: Directory.Data });
      const mimeType = filename.endsWith('.png') ? 'image/png' : 'image/jpeg';
      const streamResult = await streamScan(apiKey, base64, mimeType, controller.signal);

      let fullText = '';
      let firstChunk = true;
      for await (const chunk of streamResult.stream) {
        if (firstChunk) { clearTimeout(timeoutId); firstChunk = false; }
        fullText += chunk.text();
      }
      parts.push(stripThinking(fullText));
      done++;
    } catch (e) {
      failed++;
      const msg = controller.signal.aborted ? `✗ ${filename}: timed out` : `✗ ${filename}: ${e.message}`;
      showToast(msg, 'error');
    } finally {
      clearTimeout(timeoutId);
    }
  }

  setScanOverlay(false);
  document.querySelector('.scan-overlay-label').textContent = 'Scanning…';
  document.querySelector('.scan-overlay-sub').textContent   = 'Processing with Gemini';

  if (parts.length) {
    const combined   = parts.join('\n\n---\n\n');
    const mdFilename = `scan_${Date.now()}.md`;
    await Filesystem.writeFile({
      path: `${SCANS_DIR}/${mdFilename}`,
      data: combined,
      directory: Directory.Data,
      encoding: Encoding.UTF8,
    });
    showResult(files[0], mdFilename, combined);
    loadNotes();
  }

  selectedCells.clear();
  document.querySelectorAll('.img-cell.selected').forEach(c => c.classList.remove('selected'));
  updateScanSelectedBtn();

  const summary = failed > 0
    ? `Done — ${done} scanned, ${failed} failed`
    : `Done — ${done} image${done !== 1 ? 's' : ''} combined into one note`;
  showToast(summary, failed ? 'error' : 'success');
  setStatus(summary);
};

window.scanImageNative = async function(filename, btn) {
  const apiKey = await getApiKey();
  if (!apiKey) {
    showToast('No API key set — go to Settings', 'error');
    showSection('settings');
    return;
  }

  btn.disabled = true;
  btn.textContent = '…';
  setScanOverlay(true);
  setStatus('Scanning…');

  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(new Error('Scan timed out')), 120_000);

  try {
    const { data: base64 } = await Filesystem.readFile({ path: `${IMGS_DIR}/${filename}`, directory: Directory.Data });
    const mimeType = filename.endsWith('.png') ? 'image/png' : 'image/jpeg';
    const streamResult = await streamScan(apiKey, base64, mimeType, controller.signal);

    let fullText = '';
    showSection('result');
    const mdFilename = filename.replace(/\.(jpg|jpeg|png)$/i, '.md');
    document.getElementById('resultFilename').textContent = mdFilename;
    const contentEl = document.getElementById('resultContent');
    contentEl.textContent = '';

    // Throttle DOM updates to once per animation frame to prevent WebView freeze
    let rafPending = false;
    let firstChunk = true;
    for await (const chunk of streamResult.stream) {
      if (firstChunk) { clearTimeout(timeoutId); firstChunk = false; }
      fullText += chunk.text();
      if (!rafPending) {
        rafPending = true;
        requestAnimationFrame(() => {
          contentEl.textContent = fullText;
          rafPending = false;
        });
      }
    }
    contentEl.textContent = fullText; // ensure final state is shown

    const markdown = stripThinking(fullText);
    await Filesystem.writeFile({
      path: `${SCANS_DIR}/${mdFilename}`,
      data: markdown,
      directory: Directory.Data,
      encoding: Encoding.UTF8,
    });

    showResult(filename, mdFilename, markdown);
    showToast(`Scan complete — ${mdFilename}`, 'success');
    loadNotes();
  } catch (e) {
    clearTimeout(timeoutId);
    const msg = controller.signal.aborted ? 'Scan timed out' : 'Scan failed: ' + e.message;
    setStatus(msg, true);
    showToast(msg, 'error');
  } finally {
    setScanOverlay(false);
    btn.disabled = false;
    btn.textContent = 'Scan';
  }
};
