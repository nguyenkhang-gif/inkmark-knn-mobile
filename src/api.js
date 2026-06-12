import { GoogleGenerativeAI } from '@google/generative-ai';
import { Preferences } from '@capacitor/preferences';
import { PROMPT, PREFS_MODEL } from './constants.js';

export function stripThinking(text) {
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  const thinkMarkers = [
    /^I need to /m, /^Let me /m, /^Let's /m,
    /^Actually,/m, /^Wait,/m, /^\*\*Transcription process/m,
    /^Looking at /m, /^Re-evaluating/m,
  ];
  if (!thinkMarkers.some(p => p.test(text))) return text;
  const lines = text.split('\n');
  let lastH1 = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (/^# /.test(lines[i])) { lastH1 = i; break; }
  }
  if (lastH1 >= 0) return lines.slice(lastH1).join('\n').trim();
  const cleanStart = lines.findIndex(l => /^(#|-|\||\`\`\`)/.test(l.trim()));
  if (cleanStart >= 0) return lines.slice(cleanStart).join('\n').trim();
  return text.trim();
}

export async function createGeminiModel(apiKey) {
  const { value: model } = await Preferences.get({ key: PREFS_MODEL });
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: model || __GEMINI_MODEL__ });
}

export async function streamScan(apiKey, base64, mimeType, signal) {
  const gemini = await createGeminiModel(apiKey);
  return gemini.generateContentStream(
    [{ text: PROMPT }, { inlineData: { data: base64, mimeType } }],
    signal ? { signal } : undefined,
  );
}
