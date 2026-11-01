# 0002 – Gemeinsame Einkäufe, lokale persönliche Notizen

Status: Akzeptiert · Dokumentiert: 2026-11-01, nachträglich
Gilt für: Haushalt, Einkäufe, RLS, Datenverknüpfung

## Anlass

Beide Telefone sollen dieselben Einkäufe sehen. Browserlokaler Speicher verbindet sie nicht.

## Entscheidung und Grund

Gemeinsame Einkäufe liegen im eigenen Supabase-Projekt. Auth-Konten, serverseitige Mitgliedschaft, RLS und eingeschränkte Schreibrechte begrenzen den Zugriff auf höchstens zwei Haushaltsmitglieder. Persönliche Notizen bleiben lokal und werden nicht hochgeladen. Stabile IDs und explizite Beziehungen ermöglichen spätere Verknüpfungen unter denselben Zugriffsrechten. Keine zusätzliche Analyseplattform auf Vorrat bauen.

## Folgen und Neubewertung

Gemeinsames Speichern braucht eine bestätigte Serverantwort; Offline-Einkäufe werden derzeit nicht gespeichert. Neue Sichtbarkeit, mehr Mitglieder oder Offline-Abgleich erfordern eine Neubewertung. Der besondere POC-Einstieg steht in [0003](0003-benannte-poc-zugaenge.md).

## Belege

[Datenmodell und RLS](../../supabase/migrations/20261101020000_shared_shopping.sql), [lokale Notizen](../../src/storage.ts), [PR 20](https://github.com/ElDamiano-777/couple-playground/pull/20).
