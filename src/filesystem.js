import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { IMGS_DIR, SCANS_DIR } from './constants.js';
import { setStatus, showToast } from './ui.js';

export async function ensureDirs() {
  for (const path of [IMGS_DIR, SCANS_DIR]) {
    await Filesystem.mkdir({ path, directory: Directory.Data, recursive: true }).catch(() => {});
  }
}

export async function saveImageToFilesystem(dataUrl) {
  setStatus('Saving...');
  const ts       = Date.now();
  const ext      = dataUrl.startsWith('data:image/png') ? 'png' : 'jpg';
  const filename = `scan_${ts}.${ext}`;
  await Filesystem.writeFile({
    path: `${IMGS_DIR}/${filename}`,
    data: dataUrl.split(',')[1],
    directory: Directory.Data,
  });
  setStatus(`Saved — ${filename}`);
  showToast(`Saved: ${filename}`, 'success');
  return filename;
}

export async function readImageAsDataUrl(filename) {
  const { data } = await Filesystem.readFile({ path: `${IMGS_DIR}/${filename}`, directory: Directory.Data });
  const mime = filename.endsWith('.png') ? 'image/png' : 'image/jpeg';
  return `data:${mime};base64,${data}`;
}

export async function getImageSrc(filename) {
  try {
    const { uri } = await Filesystem.getUri({ path: `${IMGS_DIR}/${filename}`, directory: Directory.Data });
    return Capacitor.convertFileSrc(uri);
  } catch {
    return '';
  }
}
