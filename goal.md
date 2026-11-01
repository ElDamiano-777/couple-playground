# Together — a place for two

- Eine Person ohne Computerkenntnisse gestaltet ihre Couple-App ausschließlich vom iPhone aus mit einem Entwicklungsagenten.
- Sie beschreibt Wünsche auf Russisch, Englisch oder Deutsch. Der Agent antwortet immer in der Sprache der aktuellen Nachricht.
- Änderungen werden selbstständig umgesetzt, geprüft und über GitHub Pages veröffentlicht. Jede bestätigte Fertigmeldung enthält den festen App-Link und erklärt den sichtbaren Unterschied.
- Zielgruppe: zunächst zwei Personen. Noch kein öffentlicher Produktstart, kein App Store und keine Zahlungen.

## Produktziel

- Gemeinsamer Paar-Haushalt: Einkäufe, Pläne, Kinder-/Haustierbedarf und Änderungsbenachrichtigungen. Gemeinsame Einkäufe und Kinder-/Tierkarten sind echt; Pläne und Änderungsmitteilungen sind noch Beispiele.

## Produktbild

Hält unpersönlich fest, was die Nutzerin mit der App erreichen will und was das Paar beim Benutzen gelernt hat. Der Agent ergänzt es aus ihren Wünschen, nichts erfinden und nichts Privates eintragen.

- Für wen und in welcher Situation: noch offen.
- Was sich schon bewährt hat: noch offen.
- Bewusst weggelassen: noch offen.

## Aktueller Umfang

- Navigation als Ordner: Наш дом, Wishlist und Места. Наш дом enthält Покупки, Рецепты, Животные und Дети. Рецепты, Wishlist und Места speichern gemeinsame Einträge mit Titel und Text; sie lassen sich bearbeiten und nach Bestätigung entfernen. Die bestehenden gemeinsamen Daten wurden nicht verschoben oder kopiert.

- Kinder- und Tierkarten können optional ein Geburtsdatum enthalten. Es wird gemeinsam angezeigt, über die Datumswahl hinzugefügt/geändert und kann wieder geleert werden.
- Für Kinder und Tiere wird aus dem Geburtsdatum automatisch das Alter in Jahren, Monaten und Tagen angezeigt und täglich aktualisiert. Name und Geburtsdatum können unter Наш дом → Дети beziehungsweise Животные angelegt und bearbeitet werden.

- Mobile PWA mit Home-Bildschirm-Symbol, Offline-Hinweis und sicheren Aktualisierungen.
- Englische Oberfläche mit persönlicher Begrüßung, lokalen Notizen und einfacher Anleitung zur Weiterentwicklung. Die Sprache der Begrüßung ist davon unabhängig.
- Lokale Notizen bleiben im aktuellen Browser. Sie sind kein gemeinsamer Datenspeicher und kein Beweis für eine Paarverbindung.
- Gemeinsame Einkäufe im eigenen Supabase-Projekt. Aktueller POC-Einstieg: masha/damian mit Passworteingabe und bereits verbundener Testliste, ohne Mailbestätigung. Persönliche E-Mail-Konten und Einladungscodes bleiben als separater Weg erhalten. Erste echte Nutzung auf beiden iPhones steht noch aus. Gemeinsame Kinder-/Tierkarten speichern Namen und optional den Tier-Typ, lassen sich bearbeiten und nach Bestätigung entfernen. Gemeinsame Pläne und Telefon-Push sind noch nicht implementiert.
- Ein öffentliches Repository und eine öffentlich erreichbare App enthalten keine eingebauten persönlichen Inhalte oder geheimen Schlüssel.

## Erfolgsnachweise

- [x] GitHub prüft Build und Smoke-Tests vor einer Veröffentlichung.
- [x] Der feste Link liefert den erwarteten Commit und funktionsfähige App-Dateien.
- [x] Speichern, Neuladen und Speicherausfall wurden in Chromium und mobilem WebKit geprüft.
- [ ] PWA-Installation und Updates sind einmal auf einem echten iPhone geprüft. Browseremulation ersetzt das nicht.
- [ ] Eigene GitHub-/ChatGPT-Verbindung der Nutzerin und ein vollständiger Cloud-Auftrag von ihrem iPhone sind geprüft. Das Konto masheri777 ist bereits Collaborator; der vollständige Auftrag vom iPhone ist nicht belegt.
- [ ] Zwei persönliche Konten und gemeinsames Speichern sind im Supabase-Projekt geprüft. Die beiden POC-Konten sind per API geprüft; persönliche Konten und echte iPhones stehen noch aus.

## Nächste Schritte

1. Die gemeinsame Einkaufsliste im echten Alltag auf beiden iPhones benutzen.
2. Aus ihrer Rückmeldung das Produktbild füllen und den nächsten kleinen Wunsch finden.
3. Für Damian, nicht für die Nutzerin: PWA-Installation, Update und einen vollständigen Auftrag vom iPhone prüfen.
