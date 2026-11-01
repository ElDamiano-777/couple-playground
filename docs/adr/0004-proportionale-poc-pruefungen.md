# 0004 – Proportionale POC-Prüfungen

Status: Akzeptiert · Dokumentiert: 2026-11-01
Gilt für: POC-Aufwand, CI, Dokumentation, Testumfang

## Anlass

Doppelte Browserläufe, wiederholte Liveprüfungen und Deploys für reine Regeln verursachten unnötige Agenten-Runden. Der Eigentümer beauftragte eine schlankere POC-Arbeitsweise.

## Entscheidung und Grund

Entwicklungstexte erhalten einen schnellen Pflichtstatus ohne App-Build oder Deploy. App-PRs bauen; main baut und prüft iPhone-WebKit einmal vor Veröffentlichung. Lokal nur betroffene Abläufe prüfen. Erfolgreiche zentrale Liveprüfung als Nachweis übernehmen, statt sie erneut auszuführen. Unbekannte Änderungen führen zu App-Checks.

## Folgen und Neubewertung

Dokumentations-Commits müssen nicht mit version.json übereinstimmen. Desktop-Vollprüfungen und umfangreiche Audits sind kein Standard. Bestehende Daten und Zugänge erhalten. Neu entscheiden bei weiteren Zielplattformen, echtem Produktivstart oder konkreten Fehlern außerhalb dieser Abdeckung.

## Belege

[Workflow](../../.github/workflows/publish.yml), [Änderungserkennung](../../scripts/ci-scope.mjs), [Agentenablauf](../agent-publishing.md).
