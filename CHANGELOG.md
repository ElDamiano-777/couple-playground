# Änderungen

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
