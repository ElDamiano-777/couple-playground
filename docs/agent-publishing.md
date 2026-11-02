# Veröffentlichung für den POC

Vor einem Push lesen; bekannten unveränderten Inhalt weiterverwenden.

- Änderungen nach main bringen; nötige PRs wegen bestehendem Branchschutz selbst abwickeln. Kein Force-Push und keine routinemäßige Freigabe von Masha.
- Entwicklungsdokumentation, AGENTS.md, ADRs und Agent-Konfiguration: Text und Links nach Bedarf prüfen. Kein App-Build, Browserlauf, Pages-Deploy oder Abgleich mit version.json. Der Workflow liefert den vorhandenen Pflichtstatus ohne App-Arbeit; Abschluss bedeutet hier nachgewiesener Stand auf main.
- App-, Test-, Workflow-, Schema- oder unbekannte Änderungen: lokal nur betroffenen Ablauf prüfen, soweit nötig. Im PR laufen CI-Scope-Prüfung und Build. Auf main laufen Build und ein iPhone-WebKit-Smoke-Lauf vor Pages-Deploy und Liveprüfung. Bestehende Pflichtprüfungen und Branchschutz unverändert erfüllen; unbekannter Umfang führt zu App-Prüfungen.
- Bei App-Änderungen auf den passenden „Check and publish“-Lauf warten. Erfolgreichen Deploy-/Livecheck für den erwarteten Commit als Nachweis übernehmen. Keine identische manuelle Prüfung hinterher. Erst dann zum Ausprobieren auffordern; bei Fehlern oder widersprüchlichem Stand gezielt nachprüfen.
- Status etwa alle 45–60 Sekunden abfragen, Logs nur bei Fehlern ausschnittweise lesen. Nach Dokumentationsänderungen ist ein älterer App-Commit in version.json normal und kein Grund für einen Neu-Deploy.
- Changelog für sichtbare Features und wichtige Arbeitsregeländerungen knapp pflegen. Architektur- und Betriebsdokumentation nur bei tatsächlich geänderten Aussagen nachführen. Gewöhnliche POC-Umsetzung braucht kein ADR und keine zusätzliche Freigaberunde.
