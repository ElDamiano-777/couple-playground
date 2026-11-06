# Phase 2 — Shopping-Push

## Ergebnis

Neue und gekaufte Shopping-Artikel benachrichtigen nur den Partner; aktivierte Personen erhalten eine wöchentliche Erinnerung bei offenen Artikeln.

## Umfang

- [ ] Push-Abonnement und Einstellungen je angemeldetem Mitglied und Gerät speichern.
- [ ] Neue Artikel und Käufe mit Artikelnamen ausliefern, ohne die handelnde Person zu benachrichtigen.
- [ ] Wöchentliche Erinnerung in persönlicher Zeitzone ausliefern.
- [ ] iPhone- und Samsung-Anleitung direkt in Together zeigen.

## Nicht enthalten

- [ ] Keine Task-Pushes oder Fälligkeitserinnerungen.

## Verifikation

- [ ] Keine doppelten Meldungen pro Ereignis und Gerät.
- [ ] Abgemeldete/ungültige Geräte erhalten keine weitere Zustellung.
- [ ] iPhone und Samsung erhalten gegenseitige Meldungen bei geschlossener App.
- [ ] Erinnerung geht nur bei offenen Artikeln und aktivierter Einstellung ein.

## Entscheidungen

- [ ] VAPID-Privatmaterial und Zustellungs-Token bleiben ausschließlich in Supabase.

