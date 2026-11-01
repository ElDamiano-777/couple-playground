# Änderungen

## Lesbarkeit — 2026-11-01

- Schrift im gesamten Haushalt größer, kräftiger und kontrastreicher: Einkaufsliste, Familienkarten, Formulare, Hinweise und Navigation.
- Die helle Gestaltung bleibt erhalten; stärkere Überschriften, dunklere Beschriftungen und deutlichere Schaltflächen erleichtern das Lesen am iPhone.

## Alter — 2026-11-01

- Kinder- und Tierkarten zeigen anhand des gespeicherten Geburtsdatums das Alter in Jahren, Monaten und Tagen. Nicht benötigte Nullen entfallen; bei Geburt am aktuellen Tag erscheint „Born today“.
- Automatische Aktualisierung am Tageswechsel und beim Zurückkehren in die App, ohne offene Eingaben zu unterbrechen. Keine zusätzliche Alterseingabe erforderlich.

## Geburtstage — 2026-11-01

- Kinder- und Tierkarten können ein optionales Geburtsdatum erhalten, beim Anlegen und Bearbeiten mit Datumswahl am Telefon.
- Geburtstage erscheinen in den gemeinsamen Karten und lassen sich ändern oder leeren. Bestehende Karten bleiben erhalten; ein Datum wird nicht automatisch ergänzt.
- Speicherung als Kalendertag ohne Zeitzonenverschiebung, mit Prüfung gültiger vergangener Daten.

## Tierauswahl — 2026-11-01

- Beim Anlegen und Bearbeiten eines Tiers wird dessen Art aus einer Liste mit Symbolen gewählt. Bereits frei eingegebene Tierarten bleiben beim Bearbeiten erhalten.

## 0.2.2 — 2026-11-01

- Family enthält gemeinsame Kinder- und Tierkarten statt Beispielen: Name, optionaler Tier-Typ, Bearbeiten und bestätigtes Entfernen.
- Änderungen werden im bestehenden Zuhause gespeichert und auf beiden Geräten abgeglichen. Unfertige Eingaben bleiben bei Netzfehlern, Tabwechseln und normalen Updates erhalten.
- Serverseitige Haushaltsrechte und stabile Karten-IDs; keine Fotos, Geburtsdaten oder zusätzlichen Dienste. Einkäufe bleiben unverändert.

## 0.2.1 — 2026-11-01

- POC-Login mit den Benutzernamen masha und damian und eigener Passworteingabe; keine E-Mail-Bestätigung für diese beiden ausdrücklich beauftragten Testkonten.
- Beide Konten sind direkt mit einer separaten gemeinsamen POC-Einkaufsliste verbunden. Bestehende persönliche Konten und Haushalte bleiben getrennt.
- Passwort wird serverseitig geprüft und nicht im Browser-Code hinterlegt; POC-Zugänge sind gegen Änderung/Löschung durch angemeldete Tester geschützt. Die Oberfläche kennzeichnet den Testbereich.

## 0.2.0 — 2026-11-01

- Echte gemeinsame Einkaufsliste mit getrennten E-Mail-Konten, einmaliger Partner-Einladung und höchstens zwei Mitgliedern je Zuhause.
- Einkäufe hinzufügen, nach Haushalt/Kindern/Haustieren filtern, als gekauft markieren und entfernen. Abgleich alle 15 Sekunden sowie beim Zurückkehren in die App.
- Serverseitiger Zugriffsschutz, fehlertolerantes Speichern, Abmeldung und eigene Kontolöschung. Bestehende lokale Notizen bleiben auf dem Gerät.
- Pläne, Familienkarten und Änderungsmitteilungen bleiben ausdrücklich Beispiele; Telefon-Push ist noch nicht eingerichtet.

## Projektregeln — 2026-11-01

- Sanfte Begleitung neu gefasst: warme Sprache für alles, was die Nutzerin liest, Caveman nur noch für Subagent-Übergaben, interner Themenplan für Arbeitsweise und Produktdenken, Folgeprompts als Vorbilder und Merkliste in docs/begleitung-stand.md.
- Erfolgsmeldung nennt spürbare Produktannahmen und lädt zum Ausprobieren ein; Blocker enden mit einem Weiterleitungstext für Damian.
- AGENTS.md von 35 auf unter 28 KB gekürzt, weil Codex standardmäßig nur 32 KiB liest. Seltene Regeln nach docs/agent-*.md verschoben, Sicherheitsregeln nach oben. Regel zum nicht vorhandenen Testprojekt korrigiert; goal.md und owner-setup auf den tatsächlichen Stand gebracht.

- Kurze ADRs automatisch führen und vor Rückfragen lesen. Vorlage, Index und drei nachträglich belegte Entscheidungen zu Veröffentlichung, gemeinsamen Daten und dem POC-Login angelegt.

- Günstigere Subagents bei erwarteter Token-/Kostenersparnis ausdrücklich selbstständig spawnen; kurze gezielte Übergaben, passende verfügbare Modelle und Prüfung durch den Hauptagenten festgelegt.

- Original-Caveman-Skill unverändert und mit Herkunft/Lizenzen im Repo installiert. Full ist in .caveman.json voreingestellt und wird per AGENTS.md bei jeder neuen Projekt-Session angewendet.

- Datenarchitektur auf spätere featureübergreifende Verknüpfungen, Auswertungen und automatische Ereignisse ausrichten; klare Identitäten und Zugriffsrechte erhalten, ohne Infrastruktur auf Vorrat zu bauen.

- Neuer Projektchat: eine Begrüßung startet die selbstständige Orientierung und einen einfachen App-Überblick mit drei passenden nächsten Schritten; kein ungefragter Featurebau.

- Größere Featurewünsche intern in kleine, abgeschlossene Teilschritte und klar begrenzte Commits aufteilen; ohne zusätzliche Freigaben nacheinander bis zum sichtbaren Ergebnis bearbeiten.

- Vollständige selbstständige Umsetzung für die reine iPhone-Entwicklung; keine zusätzlichen Bestätigungen für gewöhnliche Schritte im beauftragten POC.
- Direkter main-Push als Standard mit unveränderten Prüfungen vor dem Pages-Deploy; erfolgreicher Abschluss erst nach Liveprüfung und mit festem App-Link.
- KISS, DRY, YAGNI, Clean Code und angemessene Modularisierung ausdrücklich festgehalten; kein Overengineering und kein Scope Creep.

## 0.1.8 — 2026-11-01

- Warmer Haushalts-Entwurf mit vier Bereichen: Zuhause, Einkaufen, Pläne und Familie.
- Ausdrücklich markierte Beispieldaten, anklickbare Einkaufsfilter und Beispielaktivitäten; keine geteilte Speicherung oder Push-Mitteilungen.
- Bestehende lokale Notizen, Namenswahl und persönliche Begrüßung bleiben über die Kopfzeile erreichbar.

## 0.1.7 — 2026-10-31

### Neu

- Einfache lokale Namensauswahl für Masha und Damian, jederzeit änderbar.

### Geändert

- Persönliche Begrüßung auf Russisch; die übrige Oberfläche bleibt Englisch.

## 0.1.6 — 2026-10-31

### Geändert

- Oberfläche, Hinweise und Offline-Ansicht standardmäßig auf Englisch; die persönliche Begrüßung bleibt separat.
- App-Name und Installationsanzeige lauten „Together“; bestehende lokale Notizen bleiben erhalten.

## 0.1.5 — 2026-10-31

### Geändert

- Persönliche englische Begrüßung für Masheri auf der Startseite, mit Liebesbotschaft und direktem Weg zu ChatGPT.

## 0.1.4 — 2026-10-31

### Entwicklung

- Entwicklungsassistent erklärt bei passendem Anlass in wenigen einfachen Sätzen, wann eine Gesprächszusammenfassung, ein frischer Chat oder eine wiederverwendbare Arbeitsweise helfen kann.
- Klare Übergaberegeln bewahren den tatsächlichen Arbeitsstand und halten private Gesprächsinhalte aus dem öffentlichen Projekt heraus.

## 0.1.3 — 2026-10-31

### Entwicklung

- Entwicklungsassistent arbeitet knapp, beginnt mit dem Ergebnis und bietet drei nummerierte nächste Schritte in der jeweiligen Gesprächssprache.
- Gelegentliche kurze Produkt-Denkanstöße helfen beim Ausgestalten eigener Ideen, ohne die Umsetzung aufzuhalten.
- Aufgaben-Agenten mit abgestuften Modell- und Denkaufwandsvorgaben vorbereitet; Grenzen automatischer Modellwahl ausdrücklich dokumentiert.

## 0.1.2 — 2026-10-31

### Build

- Cloud-Einrichtung nutzt den vorhandenen Browser ohne Administratorinstallation; die vollständige Browserprüfung auf GitHub bleibt vor jeder Veröffentlichung verpflichtend.

## 0.1.1 — 2026-10-31

### Build

- Veröffentlichte Version und App-Dateien zuverlässig prüfen; das Prüfskript wird vor der Veröffentlichung ebenfalls auf Typfehler geprüft.

## 0.1.0 — 2026-10-31

### Neu

- Erste russischsprachige, installierbare App-Hülle mit Startseite und lokalen Notizen.
- Einfache Anleitung zur Installation auf dem iPhone und zum Gestalten der App per Spracheingabe.
- Automatische Prüfungen in Desktop-Chromium und mobilem WebKit vor der GitHub-Pages-Veröffentlichung.
- Feste App-Adresse, überprüfbare Veröffentlichung und Entwicklungsregeln für Russisch, Englisch und Deutsch.

### Noch offen

- Gemeinsame Konten und Synchronisation warten auf einen eigenen Datenspeicher.
- Die persönliche Codex-Cloud-Verbindung und die Installation auf ihrem echten iPhone sind noch zu prüfen.
