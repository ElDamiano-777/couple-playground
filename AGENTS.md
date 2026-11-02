# Agentenregeln

## Arbeitsweise

- Dieses Projekt ist ein POC für zwei Personen. Jeden Wunsch als kleinste vollständige, nutzbare Lösung umsetzen; danach stoppen.
- KISS und YAGNI: einfache Lösungen, keine vorsorglichen Features, Architektur oder Infrastruktur. Kein Overengineering und keine unabhängigen Umbauten.
- DRY mit Augenmaß: echte wiederholte Logik bündeln; keine Abstraktion nur wegen ähnlich aussehender Stellen.
- Klare Namen, überschaubare Funktionen und Komponenten, passende Typen und verständliche Fehlerbehandlung. Bestehende Muster und Abhängigkeiten bevorzugen.
- Nur auftragsrelevanten Code lesen und ändern. Bekannte unveränderte Inhalte weiterverwenden. Kleine Wünsche direkt lösen; keine Routinepläne, Subagents, ADRs oder zusätzlichen Audit- und Optimierungsrunden.
- Technische Entscheidungen und gewöhnliche Umsetzungsschritte selbst übernehmen. Nur wesentliche offene Produktfragen stellen; kleine reversible Unklarheiten selbst lösen. Bestehende Daten und funktionierende Abläufe erhalten.

## Sprache und Caveman

- **Jede Session mit Caveman Full beginnen:** einmal [.agents/skills/caveman/SKILL.md](.agents/skills/caveman/SKILL.md) lesen und aktiv anwenden. Für die gesamte Session beibehalten, bis die Nutzerin einen anderen Modus verlangt. `.caveman.json` enthält den Standard `full`.
- In der Sprache der aktuellen Nachricht antworten: Russisch, Englisch oder Deutsch. Kurz, direkt und leicht verständlich; Technik nur auf Nachfrage erklären. Die Nutzerin arbeitet ausschließlich am iPhone.
- Technische Komplexität vollständig im Hintergrund halten. Die Nutzerin beschreibt Wünsche und probiert das fertige Ergebnis aus. Keine Git-, Commit-, Push-, PR-, Build-, CI- oder Deploy-Details und keine technischen Freigabe- oder Einrichtungsaufgaben an sie weiterreichen. Fortschritt und Fehler nur als verständlichen Produktstatus erklären; technische Probleme selbst lösen. Echte Konto- oder Berechtigungsblocker klärt Damian.
- Code, Kommentare, Commits und Dokumentation normal und vollständig schreiben. Klarheit geht vor Kürze.
- Gelegentlich nach einem abgeschlossenen Wunsch mit einem kurzen, passenden Denkanstoß zum Produktdenken anregen: Wer nutzt das wann? Welches Alltagsproblem löst es? Was ist die kleinste nützliche Version? Woran merkt ihr beim Ausprobieren, ob es hilft? Höchstens einen solchen Impuls in ihrer Sprache und Alltagssprache geben; keine Belehrung, keine ungefragten Zusatzfeatures, keine neue Pflichtfrage oder Dokumentationsarbeit. Ihre Idee und die Umsetzung bleiben im Mittelpunkt.

## Prüfen und veröffentlichen

- Vor einer Testaufforderung App-Start und geänderten Kernablauf per Smoke-Test prüfen. Nur direkt betroffene Abläufe testen; passende grüne Ergebnisse nicht doppelt prüfen. Weitere Tests bei konkreten Fehlern statt auf Vorrat.
- Jeder Featureauftrag umfasst automatisch Umsetzung, Smoke-Tests, Commit, direkten Push nach main und Veröffentlichung über den vorhandenen Deploy. Alle Schritte ohne erneute Bestätigung selbstständig im Hintergrund abschließen. Für gewöhnliche Wünsche keinen zusätzlichen Branch oder PR anlegen; kein Force-Push.
- main prüft Build und iPhone-WebKit vor dem Pages-Deploy und anschließenden Livecheck. Zentrale erfolgreiche Ergebnisse übernehmen. Status höchstens etwa alle 45–60 Sekunden abfragen, Fehlerlogs gezielt lesen.
- Reine Dokumentations- und Agentenregeländerungen brauchen nur Text-/Linkprüfung und Nachweis auf main; keinen App-Build, Smoke-Test oder Deploy. Ein älterer App-Commit in `version.json` ist dabei normal.
- Erst wenn Smoke-Tests, Veröffentlichung und Livecheck für den gewünschten Stand erfolgreich sind, der Nutzerin den festen App-Link geben und sie zum Ausprobieren einladen. Dann nur den sichtbaren Unterschied und die Fundstelle erklären. Solange etwas läuft oder fehlgeschlagen ist, noch keine Fertigmeldung oder Testaufforderung geben; kurz den tatsächlichen Produktstatus nennen und weiterarbeiten.

## Projekt

- App: https://eldamiano-777.github.io/couple-playground/ ; Konfiguration: `app.config.json`. iPhone-PWA, GitHub Pages und vorhandenes Supabase nutzen.
- Node.js 24; `npm ci`, `npm run dev`, `npm run build`. Smoke-Tests gezielt mit Playwright; `npm run verify` ist die optionale Vollprüfung.
- Migrationen additiv halten; main wird über die bestehende Supabase-Integration angewendet. Danach den betroffenen Speicherablauf prüfen.
- Produktstand: `goal.md`. Technische Details nur bei Bedarf in `docs/architecture.md`, `docs/owner-setup.md` und `supabase/README.md` nachsehen; keine Pflichtlektüre bei jedem Auftrag.
