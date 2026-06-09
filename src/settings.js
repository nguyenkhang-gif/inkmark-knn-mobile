import { Preferences } from '@capacitor/preferences';
import { PREFS_APIKEY, PREFS_MODEL, IMGS_DIR, SCANS_DIR } from './constants.js';
import { showToast } from './ui.js';

export function loadPaths() {
  document.getElementById('imgsDirDisplay').textContent  = IMGS_DIR;
  document.getElementById('scansDirDisplay').textContent = SCANS_DIR;
}

export async function loadSettings() {
  const { value: key }   = await Preferences.get({ key: PREFS_APIKEY });
  const { value: model } = await Preferences.get({ key: PREFS_MODEL });
  if (key) document.getElementById('apiKeyInput').value = key;
  document.getElementById('modelInput').value = model || __GEMINI_MODEL__;
}

export async function saveSettings() {
  const key   = document.getElementById('apiKeyInput').value.trim();
  const model = document.getElementById('modelInput').value.trim() || __GEMINI_MODEL__;
  await Preferences.set({ key: PREFS_APIKEY, value: key });
  await Preferences.set({ key: PREFS_MODEL,  value: model });
  showToast('Settings saved', 'success');
}

export async function getApiKey() {
  const { value } = await Preferences.get({ key: PREFS_APIKEY });
  return value || '';
}

window.saveSettings = saveSettings;
