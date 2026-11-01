import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { needsAppChecks, scopeForEvent } from './ci-scope.mjs';

test('agent rules, ADRs, licensing and project documentation skip app work', () => {
  assert.equal(needsAppChecks(['AGENTS.md', 'README.md', 'docs/adr/0001.md', '.agents/skills/caveman/SKILL.md', '.codex/agents/quick-change.toml', '.caveman.json', 'supabase/README.md', 'LICENSE']), false);
});

test('runtime, schema, tests, workflows and unknown paths always require app checks', () => {
  for (const path of ['src/App.tsx', 'src/help.md', 'public/offline.html', 'app.config.json', 'package-lock.json', 'supabase/migrations/new.sql', 'tests/family.spec.ts', '.github/workflows/publish.yml', 'scripts/ci-scope.mjs', 'unknown.file']) {
    assert.equal(needsAppChecks(['docs/architecture.md', path]), true, path);
  }
});

test('manual checks and missing comparison metadata never silently skip the app', () => {
  assert.equal(scopeForEvent('workflow_dispatch', {}), true);
  assert.equal(scopeForEvent('push', { before: '0'.repeat(40) }), true);
  assert.equal(scopeForEvent('pull_request', {}), true);
});

test('real Git diffs distinguish docs edits and application files renamed into docs', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'together-ci-scope-'));
  /** @param {string[]} args */
  const git = args => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  const commit = () => {
    git(['add', '.']);
    git(['-c', 'commit.gpgsign=false', '-c', 'user.name=CI Scope Test', '-c', 'user.email=ci@example.invalid', 'commit', '-qm', 'Synthetic scope fixture']);
    return git(['rev-parse', 'HEAD']);
  };
  try {
    git(['init', '-q']);
    mkdirSync(join(cwd, 'src')); mkdirSync(join(cwd, 'docs'));
    writeFileSync(join(cwd, 'src/app.js'), 'export const sample = true;\n');
    writeFileSync(join(cwd, 'docs/note.md'), 'Original\n');
    const first = commit();
    writeFileSync(join(cwd, 'docs/note.md'), 'Changed documentation\n');
    const second = commit();
    assert.equal(scopeForEvent('push', { before: first }, cwd), false);
    assert.equal(scopeForEvent('pull_request', { pull_request: { base: { sha: first } } }, cwd), false);
    renameSync(join(cwd, 'src/app.js'), join(cwd, 'docs/app.js'));
    commit();
    assert.equal(scopeForEvent('push', { before: second }, cwd), true);
  } finally { rmSync(cwd, { recursive: true, force: true }); }
});
