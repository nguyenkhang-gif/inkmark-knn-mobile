const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

function ask(rl, question, fallback = '') {
  return new Promise(resolve => {
    rl.question(question, ans => resolve(ans.trim() || fallback));
  });
}

const PKG_PATH = path.join(__dirname, 'package.json');

const pkg = {
  name: 'notescaner',
  version: '1.0.0',
  description: 'Scan handwritten notes with camera, extract text via Gemini, export as Markdown',
  main: 'server.js',
  scripts: {
    start: 'node server.js',
  },
  dependencies: {
    axios: '^1.13.6',
    dotenv: '^17.4.2',
    express: '^5.2.1',
    multer: '^2.1.1',
    'qrcode-terminal': '^0.12.0',
  },
};

(async () => {
  console.log('\n  NoteScaner — init\n');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  // Write package.json
  fs.writeFileSync(PKG_PATH, JSON.stringify(pkg, null, 2));
  console.log('  ✔ package.json created');

  // .env
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const overwrite = await ask(rl, '  .env already exists — overwrite? (y/N): ', 'n');
    if (overwrite.toLowerCase() !== 'y') {
      console.log('  · .env kept as-is\n');
    } else {
      await writeEnv(rl, envPath);
    }
  } else {
    await writeEnv(rl, envPath);
  }

  rl.close();

  // Create folders
  ['imgs', 'scans'].forEach(dir => {
    const p = path.join(__dirname, dir);
    if (!fs.existsSync(p)) { fs.mkdirSync(p); console.log(`  ✔ ${dir}/ created`); }
    else console.log(`  · ${dir}/ already exists`);
  });

  // npm install
  console.log('\n  Installing dependencies...\n');
  try {
    execSync('npm install', { stdio: 'inherit', cwd: __dirname });
    console.log('\n  ✔ Dependencies installed');
  } catch {
    console.error('\n  ✖ npm install failed — run it manually');
  }

  console.log('\n  Setup complete. Next steps:');
  console.log('  1. (For HTTPS) Run: mkcert <your-local-ip> localhost 127.0.0.1');
  console.log('  2. Run: node server.js\n');
})();

async function writeEnv(rl, envPath) {
  console.log('\n  Configure .env variables (press Enter to keep default)\n');

  const key    = await ask(rl, '  GEMINI_KEY        : ');
  const url    = await ask(rl, '  GEMINI_BASE_URL   [https://generativelanguage.googleapis.com/v1beta/models]: ',
                                'https://generativelanguage.googleapis.com/v1beta/models');
  const model  = await ask(rl, '  GEMINI_MODEL      [gemma-4-26b-a4b-it]: ', 'gemma-4-26b-a4b-it');
  const port   = await ask(rl, '  PORT              [3456]: ', '3456');

  const content = [
    `GEMINI_KEY=${key || 'your_api_key_here'}`,
    `GEMINI_BASE_URL=${url}`,
    `GEMINI_MODEL=${model}`,
    `PORT=${port}`,
  ].join('\n') + '\n';

  fs.writeFileSync(envPath, content);
  console.log(`\n  ✔ .env written${!key ? ' — remember to set GEMINI_KEY' : ''}`);
}
