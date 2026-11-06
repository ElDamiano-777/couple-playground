# Phase 3 — Task-Push und Erinnerungen

## Ergebnis

Tasks können einer Person oder beiden zugewiesen werden; Fälligkeitszeit und persönliche Erinnerungen funktionieren zuverlässig.

## Umfang

- [ ] Optionale Fälligkeitszeit für Tasks ergänzen.
- [ ] Neue oder geänderte Zuweisungen an betroffene Mitglieder melden.
- [ ] Erinnerungsoptionen 1 Stunde, 1 Tag und 1 Woche vor Fälligkeit anbieten.
- [ ] Erledigte oder wiederhergestellte Tasks korrekt von künftigen Erinnerungen ausschließen bzw. wieder einbeziehen.

## Nicht enthalten

- [ ] Keine Benachrichtigung über eigene Task-Aktionen.

## Verifikation

- [ ] Masha, Damian und beide als Empfänger korrekt abgedeckt.
- [ ] Keine Erinnerung ohne Uhrzeit.
- [ ] Keine weitere Erinnerung nach Erledigung.
- [ ] Keine doppelte Erinnerung pro Task, Zeitpunkt und Gerät.

## Entscheidungen

- [ ] Reminder-Scheduler verwendet vorhandene sichere Supabase-Infrastruktur.

