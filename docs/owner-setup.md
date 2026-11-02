# Einrichtung und Betrieb

- Aktuelle Navigation: Папки zeigt Наш дом / Wishlist / Места. Наш дом öffnet Покупки / Рецепты / Животные / Дети. Bestehende Einkaufsliste und Kinder-/Tierkarten verwenden weiterhin dieselben Daten und Konten. Рецепты, Wishlist und Места erlauben gemeinsame Einträge mit Titel und Text. Die additive Migration `20261101070000_folder_entries.sql` wird über die vorhandene Supabase-Integration angewendet; keine neue Kontoverbindung nötig.

## Tatsächliche Konfiguration

- Eigentümer: ElDamiano-777.
- Repository: https://github.com/ElDamiano-777/couple-playground (öffentlich, durch Damian am 31.10.2026 freigegeben).
- App: https://eldamiano-777.github.io/couple-playground/
- App- und Statuskonfiguration: app.config.json, version.json und GitHub Actions.
- GitHub Pages ist aktiviert, build_type=workflow. Private Pages wurde vom aktuellen Tarif mit HTTP 422 abgelehnt; das war der Grund für die ausdrücklich freigegebene öffentliche Sichtbarkeit.
- Keine Hosting-Abonnements, zusätzlichen Analyseanbieter oder neuen Datenprojekte gebucht.
- Vorhandene Hooka- und andere Projekte werden weder geteilt noch verändert.

## Cloud-Zugang einmalig verbinden

1. Die Nutzerin braucht ihren eigenen GitHub- und ChatGPT-Zugang. Das Konto masheri777 ist laut GitHub am 01.11.2026 Collaborator; keine weiteren Einladungen auf Verdacht versenden.
2. Damian fügt ausschließlich ihre bestätigte GitHub-Identität als Mitarbeiterin dieses Repositorys hinzu. Lesender Zugriff auf öffentliches GitHub reicht zum Veröffentlichen nicht aus.
3. In ihrem ChatGPT-Konto GitHub verbinden und eine Codex-Cloud-Umgebung mit diesem Repository einrichten. Umgebungen nicht automatisch zwischen persönlichen Konten als geteilt voraussetzen.
4. Node.js 24 bereitstellen; Setup-Skript: bash scripts/cloud-setup.sh. Netzwerkzugriff für npm und nötigenfalls cdn.playwright.dev zulassen. Codex Cloud stellt /usr/bin/chromium bereit; keine Administratorinstallation versuchen. Cloud-Vorprüfung: npm run verify:cloud. GitHub Actions prüft bei App-Änderungen iPhone-WebKit einmal auf main vor der Pages-Veröffentlichung. Der Browser-Test-Webserver läuft nur innerhalb des Testsystems.
5. Direkten GitHub-Schreibzugriff auf main und lesenden Zugriff auf Actions-Ergebnisse prüfen. Normale Featurewünsche brauchen keinen zusätzlichen Branch oder PR. Keine Geheimnisse aus anderen Projekten hinzufügen.
6. Einmal einen kleinen Wunsch von ihrem eigenen iPhone aus diktieren, main-Commit und automatische Veröffentlichung vollständig durchführen und den Live-Link prüfen.
7. Die App in Safari öffnen, „Teilen → Zum Home-Bildschirm“ verwenden. Installation und Aktualisierung auf dem echten Gerät prüfen.

## Datenstand

- Version 0.2.2 enthält die geschützte gemeinsame Einkaufsliste und gemeinsame Kinder-/Tierkarten. Die Aktivitätsansicht bleibt ein Beispiel; Telefon-Push bleibt unverbunden. Die vorbereitete Benachrichtigungsänderung wird separat verwaltet und ist nicht Teil dieser Veröffentlichung.

- Persönliche Notizen verwenden weiterhin ausschließlich lokalen Browser-Speicher. Einkäufe werden dagegen nach Anmeldung im separaten Supabase-Projekt gespeichert und sind für beide Mitglieder desselben Zuhauses sichtbar.
- Ein browserlokaler Speicher kann durch Browserdaten-Löschung verloren gehen und ist auf gemeinsam genutzten Geräten nicht vor anderen Benutzern geschützt.
- Anmeldung: getrennte E-Mail-/Passwort-Konten mit E-Mail-Bestätigung. Ein Mitglied erstellt das Zuhause und einen 48 Stunden gültigen Einmalcode, das andere tritt bei. Ein Codewechsel ersetzt den alten; ein drittes Konto kann nicht beitreten.
- Für Together wurde ein separates Supabase-Projekt eingerichtet: lyewmhtufesdccisqmin (Free, Organisation Together). GitHub-Integration: dieses Repo, Working directory `.`, Produktionsbranch main. Die früher belegten Plätze in einem anderen Konto werden nicht verwendet; keine fremden Projekte verändern.
- Öffentliche Verbindung ist vorhanden. Direkte Supabase-Verwaltung ist in diesem Chat weiterhin nicht verfügbar; Migrationen müssen über die eingerichtete GitHub-Integration bestätigt werden. Damian hat am 01.11.2026 bestätigt, dass Auth Site URL und Redirect URLs auf die feste App-Adresse zeigen.
- Für POC-Wünsche vorhandenes Supabase und bestehende Muster nutzen. Zusätzliche Dienste und rechtliche Dokumentation nicht vorsorglich einführen; maßgeblich ist der konkrete Featureauftrag.

## Prüf- und Veröffentlichungsweg

- App-PR: CI-Scope-Test, npm ci und Build ohne Browserinstallation. Entwicklungsdokumentation erhält nur einen schnellen Pflichtstatus. Unvertrauenswürdige PRs bekommen keine Live-Geheimnisse.
- Veröffentlichung: normale Änderungen direkt nach main committen und pushen. Die Nutzerin muss weder Push noch Veröffentlichung erneut bestätigen. Für gewöhnliche Wünsche keinen zusätzlichen Branch oder PR anlegen. main verlangt keinen vorab grünen Status; der Workflow prüft App-Änderungen vor der Veröffentlichung. Force-Push und Branchlöschung bleiben gesperrt.
- App-Push nach main: Build und einmal iPhone-WebKit, ausschließlich dist als Pages-Artefakt hochladen, main-Stand prüfen und veröffentlichen. Entwicklungsdokumentation löst keinen App-Deploy aus.
- Vor Veröffentlichung fehlgeschlagene Prüfungen verändern die ausgelieferte Version nicht. GitHub Pages bietet keinen eigenen privaten Produktionskandidaten; deshalb Browser-Smoke-Tests am gebauten Artefakt vor dem Deploy und HTTP-/Commitprüfung nach dem Deploy.
- Die nachgelagerte Liveprüfung erkennt fehlende Assets oder eine falsche Commit-Version. Ein erkannter Fehler nach dem Deploy erfordert eine Rücknahme; eine automatische Rücknahme ist in dieser Grundversion noch nicht implementiert und darf nicht behauptet werden.
- Wiederherstellung: Fehlercommit mit git revert als normalen main-Commit zurücknehmen und direkt pushen. Wenn main selbst keinen funktionsfähigen Build mehr erlaubt, den bekannten grünen Stand durch geprüfte Korrektur herstellen. Kein force-push und kein Löschen gespeicherter Inhalte.
- Bei App-Änderungen auf Publish und zentralen Livecheck warten; erfolgreiche Ergebnisse ohne zusätzliche identische Handprüfung übernehmen. Bei Dokumentation genügt der bestätigte Stand auf main.
- Releasekennung: version.json enthält den veröffentlichten App-Commit. Nach Dokumentations-Commits darf sie hinter main liegen.
- Lokal gezielt prüfen; npm run verify bleibt als optionale Vollprüfung verfügbar. Liveprüfung manuell nur bei unklaren zentralen Ergebnissen: EXPECTED_SHA=<voller Commit> npm run verify:live.
- In der separat gestarteten Cloud-Einrichtung unter Damians Konto bestanden Build und acht Chromium-Tests. WebKit konnte dort mangels Administratorrechten nicht eingerichtet werden; deshalb übernimmt GitHub die iPhone-WebKit-Prüfung. Die Cloud-Konfiguration muss vor Nutzung noch gespeichert und veröffentlicht werden.

## Kosten und Grenzen

- Öffentliches GitHub-Repository und Standard-Actions für die Prüfstrecke. GitHub-Pages- und Kontingentbedingungen gelten; keine Zusage unbegrenzter Ressourcen.
- Die App verwendet keine kostenpflichtige KI-API. Das ChatGPT-Kontingent der Entwicklerin ist getrennt vom App-Hosting.
- Vollständiger Cloud-Auftrag und tatsächlicher iPhone-Test bleiben bis zur Prüfung offen.
- Kein separates Supabase-Testprojekt: Migrationen auf main gehen über die GitHub-Integration ins Live-Projekt und laufen nicht durch „Check and publish“. Der Agent prüft den betroffenen Speicherablauf per Smoke-Test; die Wegwerf-Datenbanktests aus supabase/README.md dienen gezielter Fehlerdiagnose und sind keine zusätzliche Routinepflicht. Bewusstes POC-Risiko: Eine fehlerhafte Migration trifft sofort die Live-Daten.

## Quellen, 31.10.2026

- https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site
- https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
- https://learn.chatgpt.com/docs/cloud
- https://learn.chatgpt.com/docs/features/voice
- https://supabase.com/docs/guides/platform/billing-on-supabase

## Gemeinsame Einkäufe verwenden

1. Beide öffnen den festen App-Link und wählen Shopping. Jede Person erstellt ein eigenes Konto, bestätigt die E-Mail und meldet sich an.
2. Eine Person wählt Create our home und Create invitation code. Die andere trägt diesen Code nach ihrer eigenen Anmeldung bei Join our home ein. Der Code gehört nicht ins öffentliche Repository.
3. Beide können Einkäufe hinzufügen, abhaken und entfernen. Änderungen erscheinen bei offener App innerhalb ungefähr 15 Sekunden; Refresh lädt sofort neu. Nach Netzfehlern bleibt die Eingabe stehen.
4. Sign out meldet nur dieses Gerät ab. Account options enthält die bestätigungspflichtige Löschung des eigenen Kontos. Einkäufe des Zuhauses bleiben für den verbleibenden Partner erhalten; erst beim letzten Mitglied werden sie gelöscht.
5. Die automatische GitHub-/Supabase-Migration muss grün sein. Zum Prüfen reichen öffentliche URL und Publishable Key; niemals Secret Key, service_role oder Datenbankpasswort in App oder Repository verwenden.

Noch zu beobachten: echte E-Mail-Zustellung, beiderseitiger erster Beitritt und Nutzung auf den tatsächlichen iPhones. Supabase Free/Standard-Mailversand hat Limits; bei Zustellproblemen den tatsächlichen Fehler untersuchen statt E-Mail-Bestätigung abzuschalten oder ungefragt einen Maildienst zu buchen.

## Aktueller POC-Einstieg (0.2.1)

- Auf ausdrücklichen Wunsch des Eigentümers: Benutzernamen masha und damian mit demselben vom Eigentümer festgelegten POC-Passwort. Das Passwort wird nicht im Client oder dieser Dokumentation hinterlegt. Die Namensschaltflächen füllen den Benutzernamen vor; zum Anmelden ist die Passworteingabe nötig.
- Die reservierten Konten verwenden nicht zustellbare `.invalid`-Adressen und einen separaten, bereits verbundenen Testhaushalt. Kein Mailversand und kein Einladungscode nötig. Nur Testinhalte verwenden; die absichtlich einfachen geteilten POC-Zugänge sind kein Ersatz für persönliche Konten.
- Bestehende persönliche Konten bleiben erreichbar über Use a personal email account. Deren E-Mail-Bestätigung bleibt aktiviert. Der bisher verwendete Standard-Mailversand und ein gemeldeter localhost-Bestätigungslink sind für diesen persönlichen Weg noch zu klären; der POC-Login hängt davon nicht ab. Keine zusätzlichen Maildienste wurden eingerichtet.
- Für lokale Auth-Integrationstests `TOGETHER_POC_TEST_PASSWORD` nur in der lokalen Umgebung bereitstellen und `python3 scripts/test-poc-login.py` verwenden. Keine echten Sitzungen oder Passwörter in Logs, Tests oder GitHub ablegen.

## Gemeinsame Kinder-/Tierkarten (0.2.2)

- Optionales Geburtsdatum ab Migration `20261101060000_family_birthdays.sql`: vorhandene Karten bleiben ohne Datum, bis es ausdrücklich eingegeben wird. Dieselben beiden Haushaltskonten sehen und bearbeiten es. Speicherung als Datum ohne Uhrzeit; keine neue Kontoverbindung oder zusätzliche Zustellung eingerichtet.

- Im bestehenden Zuhause unter Наш дом → Дети/Животные anlegen: Name, bei Tieren optional der Tier-Typ. Beide Haushaltskonten können die Karten lesen und bearbeiten; Entfernen fragt ausdrücklich nach.
- Die additive Migration `20261101050000_family_profiles.sql` muss über die bestehende GitHub-Integration im gleichen Projekt angewendet werden. Keine neue Kontoverbindung, Serverfunktion oder Geheimnisse nötig. Fremde und abgemeldete Konten haben keinen Zugriff.
- Beim Löschen eines Kontos bleiben Karten für den Partner erhalten; beim letzten Mitglied löscht der vorhandene Haushalts-Löschpfad auch dessen Karten. POC-Zugänge weiterhin nur mit Testinhalten nutzen.
