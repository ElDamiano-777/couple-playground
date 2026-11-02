# 0004 – Proportionale POC-Prüfungen

Status: Akzeptiert · Dokumentiert: 2026-11-01 · Präzisiert: 2026-11-02
Gilt für: POC-Aufwand, CI, Dokumentation, Testumfang

## Anlass

Doppelte Browserläufe, wiederholte Liveprüfungen und Deploys für reine Regeln verursachten unnötige Agenten-Runden. Der Eigentümer beauftragte eine schlankere POC-Arbeitsweise.

## Entscheidung und Grund

Entwicklungstexte erhalten einen schnellen Pflichtstatus ohne App-Build oder Deploy. App-PRs bauen; main baut und prüft iPhone-WebKit einmal vor Veröffentlichung. Lokal nur betroffene Abläufe prüfen. Erfolgreiche zentrale Liveprüfung als Nachweis übernehmen, statt sie erneut auszuführen. Unbekannte Änderungen führen zu App-Checks.

Präzisierung durch den Eigentümer am 02.11.2026: Das gesamte Projekt und jeder Featurewunsch sind ausschließlich POC. Maßstab vor einer Testaufforderung sind App-Start und geänderter Kernablauf im Smoke-Test. Datenschutz, Compliance, Produktionshärtung und vollständige Auth-Prüfungen sind keine zusätzlichen Routineaufträge. Direkte Umsetzung statt routinemäßiger Modellwahl, Delegation oder Zukunftsarchitektur. Datenbanktests dienen konkreter Fehlerdiagnose. Vorhandene CI und App-Schutzmechanismen werden durch diese Arbeitsregeländerung nicht umgebaut.

## Folgen und Neubewertung

Dokumentations-Commits müssen nicht mit version.json übereinstimmen. Desktop-Vollprüfungen und umfangreiche Audits sind kein Standard. Bestehende Daten und Zugänge erhalten. Den POC-Modus nur auf Damians ausdrücklichen Auftrag ändern; konkrete Fehler gezielt untersuchen.

## Belege

[Workflow](../../.github/workflows/publish.yml), [Änderungserkennung](../../scripts/ci-scope.mjs), [Agentenablauf](../agent-publishing.md).
