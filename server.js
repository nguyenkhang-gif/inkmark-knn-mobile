require('dotenv').config();

process.on('uncaughtException', (err) => {
  console.error('\n  [CRASH] Uncaught exception:', err.message);
  console.error(err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('\n  [CRASH] Unhandled rejection:', reason);
  process.exit(1);
});

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const https = require('https');
const qrcode = require('qrcode-terminal');
const { scanImage } = require('./scan');

const app = express();
const PORT = process.env.PORT || 3456;
app.use(express.json());

const imgsDir = path.join(__dirname, 'imgs');
const scansDir = path.join(__dirname, 'scans');
if (!fs.existsSync(imgsDir)) fs.mkdirSync(imgsDir);
if (!fs.existsSync(scansDir)) fs.mkdirSync(scansDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, imgsDir),
  filename: (req, file, cb) => {
    const ts = Date.now();
    const ext = file.mimetype === 'image/png' ? '.png' : '.jpg';
    cb(null, `scan_${ts}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

app.use(express.static(path.join(__dirname, 'public')));
app.use('/imgs', express.static(imgsDir));

app.post('/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    console.log(`[${ts()}] UPLOAD FAILED — no file received`);
    return res.status(400).json({ error: 'No file received' });
  }
  console.log(`[${ts()}] SAVED   ${req.file.filename} (${(req.file.size / 1024).toFixed(1)} KB)`);
  res.json({ filename: req.file.filename, path: req.file.path });
});

app.get('/imgs', (req, res) => {
  const files = fs.readdirSync(imgsDir)
    .filter(f => /\.(jpg|jpeg|png)$/i.test(f))
    .sort()
    .reverse();
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 9;
  const total = files.length;
  const slice = files.slice((page - 1) * limit, page * limit);
  console.log(`[${ts()}] GALLERY page=${page} — ${slice.length}/${total} image(s)`);
  res.json({ files: slice, total, page, limit });
});

app.post('/scan/:filename', async (req, res) => {
  const filePath = path.join(imgsDir, req.params.filename);
  if (!fs.existsSync(filePath)) {
    console.log(`[${ts()}] SCAN FAILED — file not found: ${req.params.filename}`);
    return res.status(404).json({ error: 'File not found' });
  }

  const baseName = req.params.filename.replace(/\.(jpg|jpeg|png)$/i, '');
  const rawOutPath = path.join(scansDir, `${baseName}_raw.txt`);
  const mdFilename = `${baseName}.md`;

  console.log(`[${ts()}] SCAN START — ${req.params.filename}`);
  try {
    const { markdown } = await scanImage(filePath, rawOutPath);

    fs.writeFileSync(path.join(scansDir, mdFilename), markdown);
    console.log(`[${ts()}] SAVED MD  — scans/${mdFilename}`);

    if (fs.existsSync(rawOutPath)) {
      fs.unlinkSync(rawOutPath);
      console.log(`[${ts()}] CLEANED  — ${baseName}_raw.txt`);
    }

    res.json({ markdown, mdFile: mdFilename });
  } catch (err) {
    const detail = err.response?.data ?? err.message;
    console.error(`[${ts()}] SCAN ERROR — ${req.params.filename}:`, JSON.stringify(detail, null, 2));
    res.status(500).json({ error: detail });
  }
});

app.get('/scans', (req, res) => {
  const files = fs.readdirSync(scansDir)
    .filter(f => f.endsWith('.md'))
    .sort()
    .reverse();
  res.json(files);
});

app.get('/scans/:filename', (req, res) => {
  const filePath = path.join(scansDir, req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Not found' });
  res.type('text/plain').send(fs.readFileSync(filePath, 'utf8'));
});

app.delete('/scans/:filename', (req, res) => {
  const filePath = path.join(scansDir, req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Not found' });
  fs.unlinkSync(filePath);
  console.log(`[${ts()}] DELETED NOTE — ${req.params.filename}`);
  res.json({ ok: true });
});

app.delete('/imgs', (req, res) => {
  const files = fs.readdirSync(imgsDir).filter(f => /\.(jpg|jpeg|png)$/i.test(f));
  files.forEach(f => fs.unlinkSync(path.join(imgsDir, f)));
  console.log(`[${ts()}] DELETED ALL — ${files.length} image(s)`);
  res.json({ deleted: files.length });
});

app.delete('/imgs/:filename', (req, res) => {
  const filePath = path.join(imgsDir, req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
  fs.unlinkSync(filePath);
  console.log(`[${ts()}] DELETED  — ${req.params.filename}`);
  res.json({ ok: true });
});

function ts() {
  return new Date().toLocaleTimeString();
}

const certBase = '192.168.80.186+2';
const certKeyPath  = path.join(__dirname, `${certBase}-key.pem`);
const certCertPath = path.join(__dirname, `${certBase}.pem`);
const hasSSL = fs.existsSync(certKeyPath) && fs.existsSync(certCertPath);

const serverInstance = hasSSL
  ? https.createServer({ key: fs.readFileSync(certKeyPath), cert: fs.readFileSync(certCertPath) }, app)
  : app;

const server = serverInstance.listen(PORT, '0.0.0.0', () => {
  const ifaces = os.networkInterfaces();
  const localIP = Object.values(ifaces)
    .flat()
    .find(i => i.family === 'IPv4' && !i.internal)?.address ?? 'unknown';

  const proto = hasSSL ? 'https' : 'http';
  const local   = `${proto}://localhost:${PORT}`;
  const network = `${proto}://${localIP}:${PORT}`;

  console.log(`\n  NoteScaner ready ${hasSSL ? '(HTTPS)' : '(HTTP — no certs found)'}\n`);
  if (!hasSSL) console.log(`  Run: brew install mkcert && mkcert -install && mkcert 192.168.80.186 localhost 127.0.0.1\n`);
  console.log(`  Local:   ${local}`);
  console.log(`  Network: ${network}\n`);

  qrcode.generate(network, { small: true });
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n  ERROR: Port ${PORT} is already in use.`);
    console.error(`  Run: lsof -ti :${PORT} | xargs kill\n`);
  } else {
    console.error('\n  Server error:', err.message);
  }
  process.exit(1);
});
