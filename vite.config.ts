import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { execFileSync } from 'node:child_process';
import config from './app.config.json' with { type: 'json' };

const commit = process.env.GITHUB_SHA || execFileSync(`git`, [`rev-parse`, `HEAD`], { encoding: `utf8` }).trim();
const version = { commit, builtAt: new Date().toISOString() };

export default defineConfig({
  base: config.basePath,
  plugins: [react(), {
    name: `release-metadata`,
    generateBundle() {
      this.emitFile({ type: `asset`, fileName: `version.json`, source: JSON.stringify(version) });
      this.emitFile({ type: `asset`, fileName: `sw.js`, source: `
const CACHE = 'ryadom-${commit}';
const BASE = ${JSON.stringify(config.basePath)};
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.add(new Request(BASE + 'offline.html', { cache: 'reload' }))));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('ryadom-') && key !== CACHE).map(key => caches.delete(key)))));
});
self.addEventListener('fetch', event => {
  if (event.request.mode !== 'navigate' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).catch(() => caches.match(BASE + 'offline.html')));
});
` });
    },
  }],
  define: { __APP_COMMIT__: JSON.stringify(commit) },
});
