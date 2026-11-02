# Entscheidungsindex

ADRs erklären wenige, dauerhafte Entscheidungen. Erst diesen Index lesen, dann nur die für den Auftrag relevanten akzeptierten Einträge.

| ADR | Thema | Gilt bei / Suchbegriffe | Status |
| --- | --- | --- | --- |
| [0001](0001-github-pages-veroeffentlichung.md) | Veröffentlichung | Hosting, Pages, main, Deploy, Liveprüfung | Akzeptiert |
| [0002](0002-gemeinsame-daten-und-zugriff.md) | Gemeinsame Daten | Haushalt, Einkäufe, RLS, Datenverknüpfung | Akzeptiert |
| [0003](0003-benannte-poc-zugaenge.md) | POC-Zugänge | masha/damian, Anmeldung, Testkonten | Akzeptiert – POC |
| [0004](0004-proportionale-poc-pruefungen.md) | POC-Prüfaufwand | gesamtes Projekt, Smoke-Tests, Dokumentation, Tokenaufwand | Akzeptiert |

Die drei Start-Einträge wurden am 01.11.2026 nachträglich aus belegten Entscheidungen dokumentiert. Aktuellen Zustand in [Architektur](../architecture.md) und [Betrieb](../owner-setup.md) beachten.

## Gezielt lesen

- Auftrag und betroffene Daten/Verhaltensweisen mit den Suchbegriffen abgleichen. Ein Dateitreffer allein macht nicht jedes ADR relevant.
- Nur passende akzeptierte ADRs öffnen. Vorgänger und Belege erst bei einer konkreten Unklarheit nachladen. Keine komplette Sammlung oder Historie lesen.
- Kein passender Eintrag: bei Bedarf gezielt suchen und gewöhnliche Technik selbst klären. Keine Rückfrage nur wegen einer fehlenden ADR-Nummer.

## Sparsam schreiben

- Nur wichtige, länger wirksame Entscheidungen mit künftig nützlicher Begründung dokumentieren. Vorher auf vorhandene Einträge prüfen. Kein ADR pro Commit, Layoutänderung oder Implementierungsdetail.
- [Vorlage](template.md) verwenden; meist 80–150 Wörter. Entscheidung, Grund, Folgen und wenige Belege genügen. Keine Wiederholungen oder erfundenen Alternativen.
- Bei neuer Entscheidung Nachfolger verlinken und den Vorgänger als ersetzt markieren. Index aktualisieren; keine Dokumentations-Freigabeschleife.
- Keine privaten Inhalte oder Zugangsdaten ablegen. ADRs dokumentieren Entscheidungen und ersetzen keine Berechtigungen.
