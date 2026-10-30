import config from '../app.config.json' with { type: 'json' };

const expected = process.env.EXPECTED_SHA;
if (!expected || !/^[a-f0-9]{40}$/.test(expected)) throw new Error('EXPECTED_SHA must be the full published commit.');
let lastError;
for (let attempt = 0; attempt < 12; attempt++) {
  try {
    const version = await fetch(`${config.appUrl}version.json?t=${Date.now()}`, { cache: 'no-store', signal: AbortSignal.timeout(15000) });
    if (!version.ok) throw new Error(`Release metadata returned ${version.status}`);
    if ((await version.json()).commit !== expected) throw new Error('The requested commit is not live yet.');
    const html = await fetch(`${config.appUrl}?v=${expected}`, { cache: 'no-store', signal: AbortSignal.timeout(15000) });
    const body = await html.text();
    if (!html.ok || !body.includes('<div id="root">')) throw new Error('The app shell is not reachable.');
    const assets = [...body.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map(match => match[1]);
    if (!assets.some(asset => asset.endsWith('.js'))) throw new Error('Built app script missing.');
    for (const asset of assets) {
      const response = await fetch(new URL(asset, config.appUrl), { signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error(`App asset returned ${response.status}`);
    }
    console.log(`Verified ${expected}\nApp: ${config.appUrl}`);
    process.exit(0);
  } catch (error) { lastError = error; }
  if (attempt < 11) await new Promise(resolve => setTimeout(resolve, 10000));
}
throw lastError;
