# Veröffentlichung für den POC

Lesen vor einem Push; bekannten Inhalt innerhalb derselben Session nicht erneut vollständig laden.

- Eigene Änderungen nach main bringen, nötige PRs wegen bestehendem Branchschutz selbst abwickeln. Kein Force-Push und keine routinemäßige Freigabe von Masha.
- Reine Entwicklungsdokumentation, AGENTS.md, ADRs und Agent-Konfiguration: Text und gegebenenfalls Links prüfen. Kein lokaler App-Build, keine Browserprüfung, kein Pages-Deploy und kein Abgleich mit version.json. Der Workflow erkennt diese Änderungen und liefert den vorhandenen Pflichtstatus ohne App-Arbeit. Abschluss bedeutet hier: Änderung liegt auf main.
- App-, Test-, Workflow-, Schema- oder unbekannte Änderungen: lokal nur den betroffenen Ablauf prüfen, soweit sinnvoll. Keine lokale Vollprüfung als Standard. Im PR laufen CI-Scope-Prüfung und Build, ohne Browserinstallation. Auf main laufen Build und genau ein iPhone-WebKit-Smoke-Lauf vor dem Pages-Deploy. Der historische Statusname „Build and smoke tests“ bleibt für bestehenden Branchschutz erhalten.
- Fehlende oder unklare Änderungserkennung führt zu App-Prüfungen, nicht zum Überspringen. Ein manueller Workflow-Lauf prüft ebenfalls die App.
- Bei App-Änderungen auf „Check and publish“ warten. Meldet der passende main-Lauf erfolgreiche Veröffentlichung und Liveprüfung für den erwarteten Commit, diese als Nachweis verwenden. Dieselbe Liveprüfung nicht zusätzlich manuell wiederholen. Nur bei Fehlern, fehlenden Ergebnissen oder einem widersprüchlichen App-Stand gezielt nachprüfen.
- Status etwa alle 45–60 Sekunden abfragen; Logs nur bei Fehlern und dann ausschnittweise lesen. Keine wiederholten Voll-Logs oder zusätzlichen Optimierungsrunden nach einem passenden grünen Ergebnis.
- Nach einer Dokumentationsänderung darf version.json absichtlich einen älteren App-Commit zeigen. Das ist kein Deployfehler und kein Anlass für einen manuellen Neu-Deploy.
- Changelog für abgeschlossene sichtbare Features und wichtige Arbeitsregeländerungen knapp pflegen. Architektur, Betriebsdokumentation und ADRs nur ändern, wenn sich deren Inhalt tatsächlich ändert; keine Statusnotizen in mehrere Dateien kopieren.
- Neue Kosten, bestehende Zugriffe, Geheimnisse, zerstörerische Datenoperationen und Prüfregeländerungen brauchen Damians Auftrag. Diese vereinfachte POC-Prüfpolitik wurde am 01.11.2026 von ihm beauftragt; dafür nicht erneut fragen.
