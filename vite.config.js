import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    root: '.',
    server: {
      port: 3004,
      host: true,
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },
    define: {
      __GEMINI_MODEL__: JSON.stringify(env.GEMINI_MODEL || 'gemini-2.0-flash'),
    },
  };
});
