# Phase 1 — Haushalts- und Synchronisierungsbasis

## Ergebnis

Zusammenarbeit basiert auf authentifizierten Haushaltsmitgliedern statt lokal gewählten Namen; geteilte Inhalte aktualisieren sich ohne manuelles Neuladen.

## Umfang

- [x] Haushaltsmitglieder mit sicherem Anzeigenamen verfügbar machen.
- [x] Bestehende Masha-/Damian-POC-Mitglieder ohne Datenverlust übernehmen.
- [ ] Task-Zuweisung auf echte Mitglieds-IDs vorbereiten.
- [x] Änderungen an Shopping, Recipes, Meals und Tasks zeitnah auf geöffneten Partner-Geräten aktualisieren.

## Nicht enthalten

- [ ] Keine Push-Auslieferung oder Task-Erinnerungen in dieser Phase.
- [ ] Keine Änderung vorhandener Shopping-, Recipe- oder Meal-Daten.

## Verifikation

- [x] Unverbundene Konten können keine Haushaltsdaten oder Mitgliedszuordnungen lesen.
- [ ] Zwei Haushaltsmitglieder sehen dieselbe Änderung ohne manuelles Neuladen.
- [x] Bestehende POC-Daten bleiben sichtbar.

## Entscheidungen

- [x] Namen sind eine Darstellung aus sicherer Mitgliedszuordnung, nie eine Berechtigung.

Test: `python3 scripts/test-database.py` am 06.11.2026; Produktions-Gegenprobe mit zwei Geräten bleibt offen.

