# NoteScaner

NoteScaner is a self-hosted local web app that turns handwritten notes into clean Markdown files using AI. Point your phone camera at a notebook page, tap Scan, and get structured Markdown — with headings, lists, tables, and Mermaid diagrams — saved to your machine instantly.

Everything runs locally. No cloud storage. Images and notes never leave your network.

---

## How it works

1. Take a photo or upload an image from your phone or PC
2. Tap **Scan** — the server streams the image to Google Gemini AI
3. The model's chain-of-thought is stripped automatically
4. Clean Markdown is saved to `scans/` and rendered in the Result tab
5. Copy to clipboard or download the `.md` file

---

## Features

- **Mobile-first UI** — bottom nav with four tabs: Scan, Images, Notes, Result
- **Camera or upload** — live camera capture (requires HTTPS) or photo from gallery
- **Gemini streaming OCR** — response streams live to your terminal; model thinking stripped automatically
- **Mermaid diagrams** — graphs and flowcharts in your notes render as interactive diagrams
- **Saved Notes tab** — browse, open, and delete all past scan results
- **Copy MD** — works on both HTTP and HTTPS
- **QR code on startup** — scan with your phone to open the app instantly over local network
- **Auto HTTPS** — drops into HTTPS mode when mkcert certs are present, HTTP otherwise
- **Delete controls** — remove individual images or wipe all at once

---

## Requirements

- Node.js 18+
- A [Google Gemini API key](https://aistudio.google.com/app/apikey)
- `mkcert` (optional — only needed for camera access on phone)

---

## Setup

### 1. Run the init script

```bash
node init.js
```

This interactively prompts for your API key and config values, then:
- Creates `package.json`
- Writes `.env` with your values
- Creates `imgs/` and `scans/` folders
- Runs `npm install`

### 2. Configure `.env` (if editing manually)

```env
GEMINI_KEY=your_api_key_here
GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/models
GEMINI_MODEL=gemma-4-26b-a4b-it
PORT=3456
```

### 3. (Optional) Enable HTTPS for phone camera

Browsers block camera access over HTTP on non-localhost origins. Upload still works without HTTPS — the phone's file picker lets you take a photo directly.

To enable the camera tab on your phone:

```bash
brew install mkcert && mkcert -install

# Run from inside the noteScaner folder
mkcert 192.168.x.x localhost 127.0.0.1
```

Replace `192.168.x.x` with your machine's local IP (`ipconfig getifaddr en0` on Mac).

The server detects the `.pem` files automatically on next start.

### 4. Start the server

```bash
node server.js
```

Output:

```
  NoteScaner ready (HTTPS)

  Local:   https://localhost:3456
  Network: https://192.168.x.x:3456

  [QR code]
```

Scan the QR code with your phone to open the app.

---

## Usage

The UI has four tabs in the bottom navigation bar:

### 📷 Scan
- **Upload** (default) — tap to open the camera or pick from your gallery
- **Camera** — live viewfinder, capture and preview before saving (requires HTTPS)
- After saving, the app jumps to the Images tab automatically

### 🖼 Images
- 3-column grid of saved images, newest first
- Tap an image to select it — **Scan** and **Del** buttons appear
- **Delete All** removes every image at once

### 📝 Notes
- List of all saved `.md` files, newest first
- Tap any note to open and render it in the Result tab
- **Del** button removes a note

### 📄 Result
- Rendered Markdown with styled headings, lists, tables, checkboxes, and Mermaid diagrams
- Green dot on the tab badge when a new result is ready
- **Copy MD** — copies raw Markdown to clipboard (works on HTTP and HTTPS)
- **Download .md** — saves the file to your device

---

## File Structure

```
noteScaner/
├── init.js          # Interactive setup script
├── server.js        # Express server (HTTP/HTTPS, all API routes)
├── scan.js          # Gemini streaming OCR + thinking stripper
├── .env             # API keys and config (not committed)
├── imgs/            # Saved input images (not committed)
├── scans/           # Generated .md files (not committed)
└── public/
    └── index.html   # Mobile-first web UI
```

---

## Troubleshooting

**Port already in use**
```bash
lsof -ti :3456 | xargs kill
```

**Camera not working on phone**
Camera requires HTTPS. Set up mkcert (see step 3 above). On HTTP, use the Upload tab instead — the phone's native file picker includes a "Take Photo" option.

**Copy MD not working**
If you're on HTTPS, this shouldn't happen. On HTTP, the app falls back to `execCommand` which works on most mobile browsers. If it still fails, use **Download .md** instead.

**Gemini returns thinking/reasoning text**
The `stripThinking()` function in `scan.js` removes it automatically by finding the last top-level `#` heading in the output. If the model doesn't produce a heading, the full output is returned as-is.

**Server exits silently on startup**
Check if the port is in use. Any crash will now print a full stack trace — look for `[CRASH]` in the terminal output.
