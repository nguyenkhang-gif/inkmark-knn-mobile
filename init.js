const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

function ask(rl, question, fallback = '') {
  return new Promise(resolve => {
    rl.question(question, ans => resolve(ans.trim() || fallback));
  });
}

const ROOT = __dirname;

const pkg = {
  name: 'notescaner-android',
  version: '1.0.0',
  scripts: {
    dev:   'vite',
    build: 'vite build',
    sync:  'vite build && cap sync android',
    open:  'cap open android',
    apk:   'export JAVA_HOME=/opt/homebrew/opt/openjdk@21 && export PATH=/opt/homebrew/opt/openjdk@21/bin:$PATH && export ANDROID_HOME=$HOME/Library/Android/sdk && vite build && cap sync android && cd android && ./gradlew assembleDebug && cp app/build/outputs/apk/debug/app-debug.apk ../apk/NoteScaner.apk && echo \'APK ready at noteScaner-android/apk/NoteScaner.apk\'',
    run:   'export JAVA_HOME=/opt/homebrew/opt/openjdk@21 && export PATH=/opt/homebrew/opt/openjdk@21/bin:$PATH && export ANDROID_HOME=$HOME/Library/Android/sdk && vite build && cap sync android && cd android && ./gradlew assembleDebug && $HOME/Library/Android/sdk/platform-tools/adb install -r app/build/outputs/apk/debug/app-debug.apk && echo \'App installed on device\'',
    log:   '$HOME/Library/Android/sdk/platform-tools/adb logcat --pid=$($HOME/Library/Android/sdk/platform-tools/adb shell pidof -s com.notescaner.app) -v time | grep -v \'setRequestedFrameRate\\|GPUAUX\'',
  },
  dependencies: {
    '@capacitor/android':    '^8.4.0',
    '@capacitor/camera':     '^8.2.0',
    '@capacitor/core':       '^8.4.0',
    '@capacitor/filesystem': '^8.1.2',
    '@capacitor/preferences':'^^8.0.1',
    '@google/generative-ai': '^0.24.1',
    'marked':                '^18.0.5',
    'mermaid':               '^11.15.0',
  },
  devDependencies: {
    vite: '^8.0.16',
  },
};

(async () => {
  console.log('\n  NoteScaner Android — init\n');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  // package.json
  const pkgPath = path.join(ROOT, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
    console.log('  ✔ package.json created');
  } else {
    console.log('  · package.json already exists — skipped');
  }

  // .env
  const envPath = path.join(ROOT, '.env');
  if (fs.existsSync(envPath)) {
    const overwrite = await ask(rl, '  .env already exists — overwrite? (y/N): ', 'n');
    if (overwrite.toLowerCase() === 'y') {
      await writeEnv(rl, envPath);
    } else {
      console.log('  · .env kept as-is');
    }
  } else {
    await writeEnv(rl, envPath);
  }

  rl.close();

  // apk/ output dir
  const apkDir = path.join(ROOT, 'apk');
  if (!fs.existsSync(apkDir)) { fs.mkdirSync(apkDir); console.log('  ✔ apk/ created'); }

  // npm install
  console.log('\n  Installing dependencies...\n');
  try {
    execSync('npm install', { stdio: 'inherit', cwd: ROOT });
    console.log('\n  ✔ Dependencies installed');
  } catch {
    console.error('\n  ✖ npm install failed — run it manually');
  }

  console.log('\n  Setup complete. Next steps:');
  console.log('  1. Connect your Android device with USB debugging enabled');
  console.log('  2. Run: npm run run   (build + install to device)');
  console.log('  3. Or:  npm run dev   (run as web app on localhost:3004)\n');
})();

async function writeEnv(rl, envPath) {
  console.log('\n  Configure .env (press Enter to keep default)\n');

  const key   = await ask(rl, '  GEMINI_KEY    : ');
  const model = await ask(rl, '  GEMINI_MODEL  [gemini-2.0-flash]: ', 'gemini-2.0-flash');
  const port  = await ask(rl, '  PORT          [3004]: ', '3004');

  const content = [
    `GEMINI_KEY=${key || 'your_api_key_here'}`,
    `GEMINI_MODEL=${model}`,
    `PORT=${port}`,
  ].join('\n') + '\n';

  fs.writeFileSync(envPath, content);
  console.log(`\n  ✔ .env written${!key ? ' — remember to set GEMINI_KEY' : ''}`);
}
