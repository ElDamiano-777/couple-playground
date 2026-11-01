# Project installation

Unmodified original Caveman voice skill from https://github.com/juliusbrussee/caveman, pinned in SOURCE.json. Installed under the documented Codex project-skill directory `.agents/skills/caveman/`. Apache-2.0 and earlier MIT notices are retained verbatim. Only the skill text is distributed here; runtime, browser, proxy, telemetry and third-party binary components mentioned by the upstream NOTICE are not installed.

`.caveman.json` selects `full`. Upstream `src/hooks/caveman-config.js` maps the legacy `full` name to the canonical `caveman` skill. The repository AGENTS.md tells each new project session to read and apply this skill without asking for activation. Session-level requests to stop remain respected; a new session uses the project default again.

This is a repository skill installation, not a machine-wide CLI or native SessionStart-hook installation. Hosts that do not read this repository's AGENTS.md or project skills cannot be configured by these files alone. No new hosted service, routing account or model provider is added. Application code, auth configuration and access rights are unchanged by this installation.

To update: review a new upstream revision, replace only the vendored skill/license/notice files, update SOURCE.json and verify byte hashes. Do not edit the original skill into a local approximation.
