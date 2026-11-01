# Entscheidungen nachvollziehen

ADRs (Architecture Decision Records) halten wichtige Entscheidungen und ihre Gründe fest. Sie helfen künftigen Agents, ohne wiederholte technische Rückfragen weiterzuarbeiten. Aktuellen Produktumfang in goal.md und technischen Stand in docs/architecture.md daneben beachten.

## Aktive Entscheidungen

| ADR | Thema | Status |
| --- | --- | --- |
| [0001](0001-github-pages-veroeffentlichung.md) | Fester App-Link und geprüfte automatische Veröffentlichung | Akzeptiert |
| [0002](0002-gemeinsame-daten-und-zugriff.md) | Supabase, Paarzugehörigkeit und lokale Notizen | Akzeptiert |
| [0003](0003-benannte-poc-zugaenge.md) | Benannte POC-Konten mit Passworteingabe | Akzeptiert – POC-Ausnahme |

Die ersten drei ADRs wurden am 01.11.2026 nachträglich aus belegten Projektentscheidungen dokumentiert. Ihr Dokumentationsdatum ist keine Behauptung über den ursprünglichen Entscheidungszeitpunkt.

## Arbeitsweise

- Vor einer betroffenen Änderung den Index und die relevanten akzeptierten ADRs lesen. Vor einer Rückfrage prüfen, ob Auftrag, ADRs, goal.md oder owner-setup.md die Antwort schon enthalten.
- Ein ADR bei wichtigen Entscheidungen zu Architektur, Daten, Zugriff, externen Diensten, Veröffentlichungsweg oder bewussten POC-Ausnahmen selbstständig im selben Änderungsumfang anlegen. Keine Freigabe allein fürs Dokumentieren verlangen. Für kleine Text-/Layoutänderungen kein ADR erzeugen.
- [Vorlage](template.md) kopieren; nächste freie vierstellige Nummer und kurzen Dateinamen verwenden. Kontext, Entscheidung, Gründe, Folgen, Belege und Anlass für eine spätere Neubewertung knapp festhalten. Nur tatsächlich erwogene Alternativen nennen, keine erfundene Entscheidungsfindung.
- Bereits beschlossene normale Technik nicht erneut Masha zur Entscheidung vorlegen. Fehlende technische Details selbst untersuchen und sinnvoll entscheiden. Wenn eine wesentliche Produktfrage wirklich offen bleibt, höchstens eine einfache Frage stellen; nötige Konto-/Kosten-/Berechtigungsfragen an Damian richten.
- Ein ADR unterscheidet belegte Entscheidung, Annahme und offene Frage. Ein Eintrag schafft weder neue Berechtigungen noch eine Freigabe für Kosten, Löschung oder neue Datenempfänger. Aktuelle ausdrückliche Nutzerwünsche haben Vorrang.
- Bei geänderter Entscheidung ein neues ADR anlegen, den Vorgänger als ersetzt markieren und gegenseitig verlinken. Die alte Begründung erhalten. Index und Architekturübersicht kurz aktualisieren; kein allgemeines Freigabegremium und keine automatische Sperre wegen Dokumentation einführen.
- Das Repository ist öffentlich. Keine Passwörter, Tokens, privaten Antworten, persönlichen E-Mail-Adressen oder Gesprächsabschriften in ADRs übernehmen. Technische Referenzen und Links auf relevante Dateien, PRs oder Commits genügen.
