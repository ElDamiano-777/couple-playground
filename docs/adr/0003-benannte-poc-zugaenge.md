# 0003 – Benannte POC-Zugänge mit Passworteingabe

Status: Akzeptiert – POC-Ausnahme · Dokumentiert: 2026-11-01, nachträglich
Gilt für: masha/damian, Anmeldung, Testkonten

## Anlass

Der E-Mail-Einstieg verursachte Einrichtungsprobleme. Der Eigentümer verlangte benannte POC-Zugänge ohne Bestätigungsmail.

## Entscheidung und Grund

masha und damian authentifizieren sich mit eingegebenem Passwort über echte, reservierte Supabase-Konten. Sie teilen einen eigenen Testhaushalt. Das Passwort steht nicht im Client; serverseitig werden bcrypt-Verifier verwendet. Bestehende persönliche Konten bleiben getrennt, globale Mailbestätigung bleibt aktiv. Tester können die POC-Zugangsdaten nicht ändern und die Konten nicht löschen.

## Folgen und Neubewertung

Kein Mailversand oder Einladungsschritt nötig. Die einfachen geteilten Testzugänge eignen sich nicht für sensible Inhalte. Nicht ungefragt zurückbauen. Vor Nutzung mit sensiblen Daten oder weiteren Personen neu entscheiden. Offene Mailfragen persönlicher Konten bleiben davon unabhängig.

## Belege

[POC-Migration](../../supabase/migrations/20261101030000_poc_named_accounts.sql), [Auth-Prüfung](../../scripts/test-poc-login.py), [PR 21](https://github.com/ElDamiano-777/couple-playground/pull/21).
