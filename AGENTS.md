# Arbeitsregeln: ausschließlich POC

## Maßstab für jeden Auftrag

- Das gesamte Projekt und **jeder Featurewunsch** sind bis zu Damians ausdrücklicher Änderung ausschließlich ein POC für zwei Personen. Keine Einzelfallprüfung auf Produktionsreife.
- Die kleinste vollständige, nutzbare Lösung mit bestehenden Bausteinen umsetzen. Keine Vorbereitung auf Skalierung, öffentlichen Produktstart oder hypothetische Folgefeatures. Keine generischen Frameworks, zusätzlichen Schichten oder unabhängigen Aufräumarbeiten.
- **Entscheidender Nachweis: Die App startet und der geänderte Kernablauf funktioniert im Smoke-Test. Erst danach die Nutzerin zum Ausprobieren auffordern.** Keine allgemeine Fehlerfreiheit behaupten.
- Datenschutz, Compliance, Produktionshärtung, vollständige Auth-Prüfungen, Architektur-Audits und Optimierungen sind keine zusätzlichen POC-Aufträge. Die bestehende Umsetzung nutzen; solche Arbeiten nur bei ausdrücklichem Auftrag oder wenn sie einen konkret beobachteten Fehler im gewünschten Ablauf beheben.
- Wunsch umsetzen, passend prüfen, veröffentlichen, Ergebnis melden, stoppen. Keine zusätzlichen Review-, Test- oder Dokumentationsrunden auf Vorrat.

## Direkt und sparsam arbeiten

- Im aktiven Modell direkt bearbeiten. Keine routinemäßige Modellrecherche, Routing-Abwägung oder Delegation. Subagents nur bei einem größeren klar abgegrenzten Teilauftrag mit erkennbarem Nutzen und vorhandener Autorisierung.
- Nur relevante Dateien und Ausschnitte lesen. Unveränderte bekannte Inhalte weiterverwenden; keine pauschale Dokumentationslektüre. Tool-Ausgaben begrenzen, Fehlerlogs gezielt lesen.
- Kleine zusammenhängende Wünsche brauchen normalerweise einen Commit und keinen formalen Plan. Nur tatsächlich unabhängig nutzbare Teile aufteilen; keine Veröffentlichung pro technischem Zwischenschritt.
- Klare Namen, verständliche Fehler und vorhandene Muster genügen. Kein Umbau für abstrakte Codequalität. Tests prüfen sichtbares Verhalten statt die Implementierung nachzuschreiben.
- Kein ADR, Architektur-Update oder Begleitprotokoll für gewöhnliche Umsetzung. Bestehende Entscheidungen nur bei einer konkreten Unklarheit nachlesen. Wichtige Arbeitsregeländerungen und sichtbare Features knapp im Changelog festhalten.

## Mit der Nutzerin arbeiten

- Sie entwickelt ihre erste App ausschließlich am iPhone. Antworte in der Sprache ihrer aktuellen Nachricht: Russisch, Englisch oder Deutsch; eine ausdrücklich gewünschte Sprache geht vor. Die App-Sprache bleibt davon unabhängig.
- Warm, direkt, kurz und in natürlichen ganzen Sätzen schreiben. Keine Füllsätze, künstliches Lob oder Telegrammsprache. Über Wünsche, sichtbares Verhalten und Ergebnisse sprechen; Technik nur auf Nachfrage erklären.
- Ein Featurewunsch autorisiert die gewöhnlichen Schritte bis zur Veröffentlichung: ändern, installieren, gezielt prüfen, committen, nach main pushen, nötigenfalls PR abwickeln und Deploy beobachten. Keine erneuten Freigaben oder technischen Aufgaben für sie. Plattformberechtigungen bleiben verbindlich.
- Kleine reversible Unklarheiten selbst entscheiden. Nur bei einer wesentlichen offenen Produktfrage eine einfache Frage mit konkreten Beispielen stellen. Keine ungefragten Zusatzfeatures.
- Technische Fehler selbst lösen. Bei einem echten Konto- oder Berechtigungsblocker kurz den Stand erklären und einen fertigen Weiterleitungstext für Damian geben. Nachrichten an ihn nur über einen ausdrücklich autorisierten Weg senden.
- Kernaussage zuerst, dann nur nötige Details. Bei neuem Projektchat, abgeschlossenem Feature oder offener Produktentscheidung drei konkrete Folgeprompts als eine nummerierte Auswahl in ihrer Ich-Form anbieten. Höchstens einer schlägt etwas Neues vor. Status, Pflege und Bestätigungen brauchen kein Menü.
- Eine Nummer führt die passende letzte Auswahl aus. Ausprobieren oder Nachdenken löst keinen Featurebau aus. Bei einer Produktfrage sind deren Antwortmöglichkeiten die Auswahl; kein zweites Menü.
- Gelegentlich einen kurzen passenden Hinweis zum klein Anfangen, Ausprobieren oder konkreten Rückmelden geben, ohne Unterricht oder zusätzliche Verwaltungsarbeit. Abgelehnte Vorschläge und bereits bekannte Themen im [Begleitstand](docs/begleitung-stand.md) nur bei Bedarf nachsehen.
- Bei einer bloßen Begrüßung im neuen Chat nur `goal.md` und `app.config.json` lesen, soweit noch nicht bekannt. Kurz tatsächlichen App-Stand, festen Link und drei passende nächste Wünsche nennen. Die Begrüßung startet keinen Featurebau.
- Nach erfolgreicher Veröffentlichung kurz Änderung, festen klickbaren App-Link und Fundstelle nennen und zum Ausprobieren einladen. Nur nach erfolgreichem Smoke-Test und Veröffentlichung „fertig“ sagen. Solange etwas läuft oder blockiert ist, genau das melden. Keine Desktop-, Cache- oder Neuinstallationsanleitung als Standard.

## Projekt und gezielte Anleitungen

- iPhone-PWA auf GitHub Pages: https://eldamiano-777.github.io/couple-playground/ . Verbindliche Adresse: `app.config.json`; Projektpfad `/couple-playground/` beibehalten. Vorhandenes Hosting und Supabase verwenden.
- Lokal: Node.js 24, `npm ci`, `npm run dev`. Cloud-Einrichtung: `bash scripts/cloud-setup.sh`. `npm run verify` ist die optionale Vollprüfung.
- Dieses Repository ist unabhängig von Hooka und SAFEKH. Keine fremden Release-, Jira-, Versions- oder Prüfprozesse übernehmen.
- Vor einem Push: [Veröffentlichung](docs/agent-publishing.md). Nur bei neuen Datenmodellen oder geänderten Beziehungen: [Datenmodelle](docs/agent-data-linking.md).
- Nur bei tatsächlich nötiger Delegation oder gewünschter Modellwahl: [Modelle](docs/agent-models.md). Nur bei einem konkreten Chatwechsel oder Skill-Vorschlag: [Chats und Skills](docs/agent-chats-and-skills.md). Keine Anleitung erneut vollständig lesen, wenn sie unverändert bekannt ist.

## Smoke-Test und Veröffentlichung

- Nur App-Start, geänderten Kernablauf und unmittelbar betroffene Nachbarn prüfen. Nach passendem grünen Ergebnis stoppen. Weitere Tests nur nach Änderungen, Fehlern oder einem konkret offenen Problem; vorhandene CI-Pflichtprüfungen nicht umgehen.
- App-Code lokal nur gezielt prüfen, soweit nötig. Der PR baut; main prüft Build und iPhone-WebKit vor Veröffentlichung. Den erfolgreichen zentralen Deploy-/Livecheck übernehmen, nicht identisch manuell wiederholen.
- Reine Entwicklungsdokumentation und Agent-Konfiguration: Text und Links nach Bedarf prüfen. Kein App-Build, Browser-/Datenbanktest oder App-Deploy; nachgewiesener Stand auf main genügt. Keine Testaufforderung an die Nutzerin für reine Regeln.
- Migrationen folgen dem bestehenden POC-Weg: additiv nach main; kein separater Branch allein deshalb. Es gibt kein Supabase-Testprojekt, und „Check and publish“ prüft keine Migrationen. Nach dem Push den betroffenen Speicherablauf per Smoke-Test prüfen. Die Wegwerf-Datenbanktests aus `supabase/README.md` nur bei einem konkreten Fehler oder gezieltem Diagnosebedarf nutzen.
- Keine halbfertige Funktion veröffentlichen. Bei Fehlern gezielt reparieren oder den vorhandenen Wiederherstellungsweg nutzen; nicht blind Daten zurücksetzen. Auf Wunsch Änderungen zurücknehmen und gespeicherte Inhalte erhalten.
