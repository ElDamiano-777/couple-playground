# 0002 – Gemeinsame Daten in Supabase, persönliche Notizen bleiben lokal

- Status: Akzeptiert
- Dokumentiert am: 2026-11-01
- Geltungsbereich: Einkäufe, Anmeldung, Datenzugriff und spätere Datenverknüpfungen
- Herkunft: Nachträgliche Dokumentation der implementierten Datenbasis

## Anlass

Beide Partner sollen vom eigenen Telefon aus dieselbe Einkaufsliste verwenden. Lokaler Browser-Speicher stellt diese Verbindung nicht her. Das Projekt hat dafür einen eigenen Supabase-Zugang erhalten; fremde Projekte werden nicht mitverwendet.

## Entscheidung und Gründe

Gemeinsame Einkäufe liegen in Supabase. Authentifizierte Konten erhalten über eine serverseitige Mitgliedschaft Zugriff auf ihren Haushalt. Row Level Security, eingeschränkte Spaltenrechte und kontrollierte Funktionen setzen diesen Zugriff durch. Ein Haushalt hat höchstens zwei Mitglieder. Persönliche Konten können über einen ablaufenden, einmaligen Einladungscode verbunden werden.

Lokale Notizen bleiben unverändert im jeweiligen Browser und werden nicht automatisch hochgeladen. Stabile IDs, explizite Beziehungen und vorhandene Zeit-/Herkunftsdaten erhalten die Anschlussfähigkeit für spätere featureübergreifende Auswertungen. Weitere Daten oder eine Event-/Analyseplattform werden erst bei konkretem Auftrag ergänzt.

## Folgen und Grenzen

Eine versteckte Oberfläche oder die Namenswahl ist kein Zugriffsschutz. Erfolgreiches gemeinsames Speichern setzt eine bestätigte Serverantwort voraus. Verknüpfungen und spätere Auswertungen dürfen die Sichtbarkeit der Quelldaten nicht erweitern. Offline-Einkäufe werden derzeit nicht gespeichert; Eingaben bleiben bei Fehlern stehen. Die besondere POC-Anmeldung ist in [ADR 0003](0003-benannte-poc-zugaenge.md) dokumentiert.

## Belege

- [Datenmodell, Mitgliedschaft und RLS](../../supabase/migrations/20261101020000_shared_shopping.sql)
- [Datenzugriff der App](../../src/shared/useSharedShopping.ts)
- [Lokale Notizen](../../src/storage.ts)
- [Direkte Zugriffsprüfungen](../../supabase/tests/access.sql)
- [Schemaänderung, PR 19](https://github.com/ElDamiano-777/couple-playground/pull/19)
- [Gemeinsame Einkaufsliste, PR 20](https://github.com/ElDamiano-777/couple-playground/pull/20)

## Wann neu entscheiden?

Bei mehr als zwei Mitgliedern, neuem fachlichem Sichtbarkeitsbedarf, einem ausdrücklich beauftragten Offline-Abgleich oder neuen Datenquellen. Bereits geklärte technische Gründe zuerst hier nachlesen; nur tatsächlich neue fachliche Fragen stellen.
