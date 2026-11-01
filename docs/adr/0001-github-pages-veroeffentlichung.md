# 0001 – Fester App-Link und geprüfte automatische Veröffentlichung

- Status: Akzeptiert
- Dokumentiert am: 2026-11-01
- Geltungsbereich: Hosting, Veröffentlichung, Agentenablauf
- Herkunft: Nachträgliche Dokumentation des eingerichteten Projektwegs

## Anlass

Die App wird vom iPhone aus weiterentwickelt. Nach einem Wunsch soll der Agent Umsetzung und Veröffentlichung übernehmen und einen dauerhaft gültigen Link liefern. Das Repository nutzt GitHub Pages und einen vorhandenen Prüfworkflow.

## Entscheidung und Gründe

Die feste App-Adresse und der Projektpfad bleiben in app.config.json verankert. Änderungen landen auf main und lösen den vorhandenen Workflow aus. Bestehender Branchschutz wird respektiert; notwendige PRs, Pflichtprüfungen und Merge erledigt der Agent ohne routinemäßige Rückfragen selbst.

Vor dem Pages-Deploy prüfen Build und Browser-Smoke-Tests das Artefakt. Erst erfolgreiche Veröffentlichung und Liveprüfung rechtfertigen die Meldung, dass eine App-Änderung sichtbar ist.

## Folgen und Grenzen

Kein Hostingwechsel oder neuer Dienst für gewöhnliche Änderungen. GitHub Pages liefert statische Dateien; gemeinsame Daten benötigen ein eigenes Backend. Ein Commit oder grüner Build allein beweist keinen erfolgreichen Deploy. Automatisches Zurückrollen nach einem fehlgeschlagenen Livecheck ist nicht eingerichtet.

## Belege

- [App-Konfiguration](../../app.config.json)
- [Prüf- und Veröffentlichungsworkflow](../../.github/workflows/publish.yml)
- [Liveprüfung](../../scripts/verify-live.mjs)
- [Betriebsdokumentation](../owner-setup.md)

## Wann neu entscheiden?

Wenn ein beauftragtes Feature Anforderungen stellt, die Pages oder das getrennte Backend nicht erfüllen, oder der Eigentümer Hosting beziehungsweise Veröffentlichungsregeln ausdrücklich ändern möchte.
