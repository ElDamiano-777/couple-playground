# 0003 – Benannte POC-Konten mit Passworteingabe

- Status: Akzeptiert – POC-Ausnahme
- Dokumentiert am: 2026-11-01
- Geltungsbereich: Einfacher Einstieg in die POC-Einkaufsliste
- Herkunft: Nachträgliche Dokumentation des ausdrücklich beauftragten POC-Einstiegs

## Anlass

Der E-Mail-Einstieg erforderte zusätzliche Konfiguration; ein Bestätigungslink führte zu localhost. Der Eigentümer beauftragte für den POC stattdessen die Benutzernamen masha und damian mit Passworteingabe und ohne Bestätigungsmail. Das konkrete Passwort gehört nicht in diese Dokumentation.

## Entscheidung und Gründe

Zwei neu angelegte, reservierte Auth-Identitäten verwenden nicht zustellbare Loginadressen und einen eigenen, bereits verbundenen Testhaushalt. Die App bildet Benutzernamen auf diese Konten ab und lässt das eingegebene Passwort tatsächlich durch Supabase Auth prüfen. Der Client enthält weder das Passwort noch eine lokale Erfolgssimulation. Serverseitig werden bcrypt-Verifier hinterlegt.

Bestehende persönliche Konten, Mitgliedschaften und Einkäufe bleiben getrennt. Die globale E-Mail-Bestätigung wird nicht abgeschaltet. Die Namensschaltflächen füllen den Benutzernamen vor; die Namenswahl allein gewährt keinen Zugriff. Die geteilten POC-Identitäten sind gegen Änderung der Zugangsdaten und Löschung durch angemeldete Tester geschützt.

## Folgen und Grenzen

Der POC benötigt keinen Mailversand und keinen Einladungsschritt. Die bewusst einfachen geteilten Testzugänge sind kein Ersatz für persönliche Konten und eignen sich nicht für sensible Inhalte. Das wird in der App kenntlich gemacht. Der persönliche E-Mail-Einstieg bleibt ein eigener Weg mit offenen Mail-/Redirect-Einrichtungsfragen.

Künftige Agents sollen diese Ausnahme nicht ungefragt zurückbauen, das Passwort nicht offenlegen und keine bestehenden persönlichen Konten für den POC zweckentfremden.

## Belege

- [Reservierte Konten und Schutzregeln](../../supabase/migrations/20261101030000_poc_named_accounts.sql)
- [Zuordnung der Benutzernamen](../../src/shared/client.ts)
- [Echte Passwortprüfung](../../src/shared/useSharedShopping.ts)
- [Prüfung mit dem Anmeldedienst](../../scripts/test-poc-login.py)
- [Browserprüfungen](../../tests/poc-login.spec.ts)
- [Umsetzung, PR 21](https://github.com/ElDamiano-777/couple-playground/pull/21)

## Wann neu entscheiden?

Vor Nutzung mit sensiblen Inhalten, für weitere Personen oder wenn der Eigentümer den POC-Zugang ersetzen möchte. Dann den neuen Bedarf klären und einen Nachfolger dokumentieren; persönliche Berechtigungen nicht aus dieser POC-Ausnahme ableiten.
