import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// These are development-only paths. Remove an exemption if the app starts consuming it.
const developmentOnly = /^(?:docs\/|\.agents\/|\.codex\/|\.caveman\.json$|(?:AGENTS|CHANGELOG|README(?:\.[^/]+)?)\.md$|LICENSE(?:[-.][^/]*)?$|NOTICE$|supabase\/README\.md$|\.github\/(?:ISSUE_TEMPLATE\/|PULL_REQUEST_TEMPLATE\.md$))/;

export function needsAppChecks(paths) {
  return paths.some(path => !developmentOnly.test(path));
}

export function scopeForEvent(eventName, event, cwd = process.cwd()) {
  if (eventName === 'workflow_dispatch') return true;
  const base = eventName === 'pull_request' ? event.pull_request?.base?.sha : event.before;
  try {
    if (!/^[a-f0-9]{40}$/i.test(base || '') || /^0+$/.test(base)) throw new Error('No comparison commit');
    const git = args => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    try { git(['cat-file', '-e', `${base}^{commit}`]); }
    catch { git(['fetch', '--no-tags', '--depth=1', 'origin', base]); }
    // Renaming application code into docs must still count as an application deletion.
    const paths = git(['diff', '--no-renames', '--name-only', '-z', base, 'HEAD']).split('\0').filter(Boolean);
    return needsAppChecks(paths);
  } catch {
    console.warn('Change scope unavailable; running app checks.');
    return true;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let app = true;
  try {
    const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
    app = scopeForEvent(process.env.GITHUB_EVENT_NAME, event);
  } catch {
    console.warn('Event metadata unavailable; running app checks.');
  }
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `app=${app}\n`);
  console.log(app ? 'POC scope: app checks required.' : 'POC scope: development documentation only; no app build or deployment.');
}
