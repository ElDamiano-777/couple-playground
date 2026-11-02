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
- Code, Kommentare, Commits und Dokumentation normal und vollständig schreiben. Klarheit geht vor Kürze.

## Prüfen und veröffentlichen

- Vor einer Testaufforderung App-Start und geänderten Kernablauf per Smoke-Test prüfen. Nur direkt betroffene Abläufe testen; passende grüne Ergebnisse nicht doppelt prüfen. Weitere Tests bei konkreten Fehlern statt auf Vorrat.
- Gewöhnliche Featureaufträge bis Commit, main und Veröffentlichung abschließen. Bestehenden Branchschutz und CI erfüllen; nötige PRs selbst abwickeln, kein Force-Push.
- Der PR baut; main prüft Build und iPhone-WebKit vor dem Pages-Deploy und anschließenden Livecheck. Zentrale erfolgreiche Ergebnisse übernehmen. Status höchstens etwa alle 45–60 Sekunden abfragen, Fehlerlogs gezielt lesen.
- Reine Dokumentations- und Agentenregeländerungen brauchen nur Text-/Linkprüfung und Nachweis auf main; keinen App-Build, Smoke-Test oder Deploy. Ein älterer App-Commit in `version.json` ist dabei normal.
- Erst nach erfolgreicher Prüfung und Veröffentlichung fertig melden und den festen App-Link nennen. Bei laufenden oder fehlgeschlagenen Schritten den tatsächlichen Stand nennen; technische Fehler selbst beheben.

## Projekt

- App: https://eldamiano-777.github.io/couple-playground/ ; Konfiguration: `app.config.json`. iPhone-PWA, GitHub Pages und vorhandenes Supabase nutzen.
- Node.js 24; `npm ci`, `npm run dev`, `npm run build`. Smoke-Tests gezielt mit Playwright; `npm run verify` ist die optionale Vollprüfung.
- Migrationen additiv halten; main wird über die bestehende Supabase-Integration angewendet. Danach den betroffenen Speicherablauf prüfen.
- Produktstand: `goal.md`. Technische Details nur bei Bedarf in `docs/architecture.md`, `docs/owner-setup.md` und `supabase/README.md` nachsehen; keine Pflichtlektüre bei jedem Auftrag.
