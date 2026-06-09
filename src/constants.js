export const PREFS_APIKEY = 'gemini_api_key';
export const PREFS_MODEL  = 'gemini_model';
export const IMGS_DIR     = 'noteScaner/imgs';
export const SCANS_DIR    = 'noteScaner/scans';
export const PAGE_LIMIT   = 9;

export const PROMPT = `You are an OCR assistant. Output ONLY the final Markdown document.
Do NOT show reasoning, thinking steps, or deliberation.
Start your response directly with the markdown content.

Rules:
- Preserve headings, lists, tables, and document structure
- If you see any graph, chart, flowchart, or diagram — use Mermaid syntax inside a \`\`\`mermaid block
- Output nothing except the final Markdown`;
