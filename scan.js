require('dotenv').config();
const fs = require('fs');
const axios = require('axios');

const GEMINI_KEY = process.env.GEMINI_KEY;
const BASE_URL = process.env.GEMINI_BASE_URL;
const MODEL = process.env.GEMINI_MODEL;

const PROMPT = `You are an OCR assistant. Output ONLY the final Markdown document.
Do NOT show reasoning, thinking steps, or deliberation.
Start your response directly with the markdown content.

Rules:
- Preserve headings, lists, tables, and document structure
- If you see any graph, chart, flowchart, or diagram — use Mermaid syntax inside a \`\`\`mermaid block
- Output nothing except the final Markdown`;

function stripThinking(text) {
  // Remove explicit <think> blocks
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  const thinkMarkers = [
    /^I need to /m, /^Let me /m, /^Let's /m,
    /^Actually,/m, /^Wait,/m, /^\*\*Transcription process/m,
    /^Looking at /m, /^Re-evaluating/m,
  ];

  const hasThinking = thinkMarkers.some(p => p.test(text));
  if (!hasThinking) return text;

  // Find the last top-level heading — that's where the final answer starts
  const lines = text.split('\n');
  let lastH1 = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (/^# /.test(lines[i])) { lastH1 = i; break; }
  }
  if (lastH1 >= 0) return lines.slice(lastH1).join('\n').trim();

  // Fallback: strip leading lines that look like deliberation
  const cleanStart = lines.findIndex(l => /^(#|-|\||\`\`\`)/.test(l.trim()));
  if (cleanStart >= 0) return lines.slice(cleanStart).join('\n').trim();

  return text.trim();
}

async function scanImage(filePath, rawOutPath) {
  const base64 = fs.readFileSync(filePath).toString('base64');
  const mimeType = filePath.endsWith('.png') ? 'image/png' : 'image/jpeg';

  const body = {
    contents: [{ parts: [
      { text: PROMPT },
      { inline_data: { mime_type: mimeType, data: base64 } }
    ]}],
    generationConfig: { temperature: 0.1 },
  };

  const url = `${BASE_URL}/${MODEL}:streamGenerateContent?alt=sse&key=${GEMINI_KEY}`;
  console.log('\n[SCAN] Stream starting...');

  const response = await axios.post(url, body, {
    responseType: 'stream',
    headers: { 'Content-Type': 'application/json' },
  });

  let fullText = '';
  const rawStream = fs.createWriteStream(rawOutPath);
  let buffer = '';

  await new Promise((resolve, reject) => {
    response.data.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop(); // hold incomplete line

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const jsonStr = line.slice(6).trim();
        if (!jsonStr || jsonStr === '[DONE]') continue;
        try {
          const json = JSON.parse(jsonStr);
          const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
          if (text) {
            fullText += text;
            rawStream.write(text);
            process.stdout.write(text); // live stream to terminal
          }
        } catch { /* skip malformed SSE chunk */ }
      }
    });

    response.data.on('end', () => { rawStream.end(); resolve(); });
    response.data.on('error', reject);
  });

  console.log('\n\n[SCAN] Stream complete — raw saved to:', rawOutPath);

  const markdown = stripThinking(fullText);

  console.log('\n[SCAN] Cleaned result:\n' + '─'.repeat(60));
  console.log(markdown);
  console.log('─'.repeat(60) + '\n');

  return { markdown, raw: fullText };
}

module.exports = { scanImage };
