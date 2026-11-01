# 0001 – Geprüfte Veröffentlichung auf GitHub Pages

Status: Akzeptiert · Dokumentiert: 2026-11-01, nachträglich
Gilt für: Hosting, Pages, main, Deploy, Liveprüfung

## Anlass

Die Entwicklung erfolgt vom iPhone. Änderungen brauchen einen festen App-Link und einen selbstständig abgewickelten Veröffentlichungsweg.

## Entscheidung und Grund

GitHub Pages und der Projektpfad aus app.config.json bleiben bestehen. Ziel ist main. Erforderliche PRs, Prüfungen und Merge übernimmt der Agent; vorhandenen Branchschutz respektieren. Der Workflow prüft das Artefakt vor dem Deploy und danach den ausgelieferten Commit sowie App-Dateien. Erfolg erst nach Liveprüfung melden.

## Folgen und Neubewertung

Pages liefert statische Dateien; gemeinsame Daten benötigen ein Backend. Automatisches Zurückrollen nach einem fehlgeschlagenen Livecheck fehlt. Neu entscheiden, wenn ein beauftragter Bedarf diesen Hostingweg überfordert oder der Eigentümer ihn ändern möchte.

## Belege

[App-Konfiguration](../../app.config.json), [Workflow](../../.github/workflows/publish.yml), [Liveprüfung](../../scripts/verify-live.mjs).
