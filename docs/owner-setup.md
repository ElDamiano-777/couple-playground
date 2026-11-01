# Einrichtung und Betrieb

## Tatsächliche Konfiguration

- Eigentümer: ElDamiano-777.
- Repository: https://github.com/ElDamiano-777/couple-playground (öffentlich, durch Damian am 31.10.2026 freigegeben).
- App: https://eldamiano-777.github.io/couple-playground/
- App- und Statuskonfiguration: app.config.json, version.json und GitHub Actions.
- GitHub Pages ist aktiviert, build_type=workflow. Private Pages wurde vom aktuellen Tarif mit HTTP 422 abgelehnt; das war der Grund für die ausdrücklich freigegebene öffentliche Sichtbarkeit.
- Keine Hosting-Abonnements, zusätzlichen Analyseanbieter oder neuen Datenprojekte gebucht.
- Vorhandene Hooka- und andere Projekte werden weder geteilt noch verändert.

## Cloud-Zugang einmalig verbinden

1. Die Nutzerin braucht ihren eigenen GitHub- und ChatGPT-Zugang. Ihr GitHub-Benutzername ist noch unbekannt; keine Einladung auf Verdacht versenden.
2. Damian fügt ausschließlich ihre bestätigte GitHub-Identität als Mitarbeiterin dieses Repositorys hinzu. Lesender Zugriff auf öffentliches GitHub reicht zum Veröffentlichen nicht aus.
3. In ihrem ChatGPT-Konto GitHub verbinden und eine Codex-Cloud-Umgebung mit diesem Repository einrichten. Umgebungen nicht automatisch zwischen persönlichen Konten als geteilt voraussetzen.
4. Node.js 24 bereitstellen; Setup-Skript: bash scripts/cloud-setup.sh. Netzwerkzugriff für npm und nötigenfalls cdn.playwright.dev zulassen. Codex Cloud stellt /usr/bin/chromium bereit; keine Administratorinstallation versuchen. Cloud-Vorprüfung: npm run verify:cloud. GitHub Actions prüft unverändert beide Browser vor der Pages-Veröffentlichung. Der Browser-Test-Webserver läuft nur innerhalb des Testsystems.
5. GitHub-Schreibzugriff auf main und lesenden Zugriff auf Actions-Ergebnisse prüfen. Falls Branchschutz einen PR verlangt, zusätzlich Branch-/PR-/Merge-Rechte prüfen. Keine Geheimnisse aus anderen Projekten hinzufügen.
6. Einmal einen kleinen Wunsch von ihrem eigenen iPhone aus diktieren, main-Commit und automatische Veröffentlichung vollständig durchführen und den Live-Link prüfen.
7. Die App in Safari öffnen, „Teilen → Zum Home-Bildschirm“ verwenden. Installation und Aktualisierung auf dem echten Gerät prüfen.

## Datenstand

- Version 0.2.0 ersetzt den Einkaufsentwurf durch eine geschützte gemeinsame Liste. Pläne, Familienkarten und Aktivitätsmeldungen bleiben Beispiele; Telefon-Push bleibt unverbunden.

- Persönliche Notizen verwenden weiterhin ausschließlich lokalen Browser-Speicher. Einkäufe werden dagegen nach Anmeldung im separaten Supabase-Projekt gespeichert und sind für beide Mitglieder desselben Zuhauses sichtbar.
- Ein browserlokaler Speicher kann durch Browserdaten-Löschung verloren gehen und ist auf gemeinsam genutzten Geräten nicht vor anderen Benutzern geschützt.
- Anmeldung: getrennte E-Mail-/Passwort-Konten mit E-Mail-Bestätigung. Ein Mitglied erstellt das Zuhause und einen 48 Stunden gültigen Einmalcode, das andere tritt bei. Ein Codewechsel ersetzt den alten; ein drittes Konto kann nicht beitreten.
- Für Together wurde ein separates Supabase-Projekt eingerichtet: lyewmhtufesdccisqmin (Free, Organisation Together). GitHub-Integration: dieses Repo, Working directory `.`, Produktionsbranch main. Die früher belegten Plätze in einem anderen Konto werden nicht verwendet; keine fremden Projekte verändern.
- Öffentliche Verbindung ist vorhanden. Direkte Supabase-Verwaltung ist in diesem Chat weiterhin nicht verfügbar; Migrationen müssen über die eingerichtete GitHub-Integration bestätigt werden. Damian hat am 01.11.2026 bestätigt, dass Auth Site URL und Redirect URLs auf die feste App-Adresse zeigen.
- Für zusätzliche Daten oder Dienste: separater Projektzugang beziehungsweise freigegebener Tarif, dokumentierter Zweck und Datenarten, Empfänger, Zugriffs-/Löschregeln, Aufbewahrung und gegebenenfalls Vereinbarungen. Rechtliche Rollen und Grundlagen sind nicht durch dieses Setup festgestellt.
- Vor echten Paar-Daten: zwei Konten, sichere ablaufende Einladungen, serverseitige Zugriffsregeln, direkte Negativtests mit fremdem Konto und Abmelde-/Löschpfade. Keine gemeinsamen Fake-Logins als Abkürzung.

## Prüf- und Veröffentlichungsweg

- PR: npm ci, Browserinstallation, Build und Smoke-Tests. Unvertrauenswürdige PRs bekommen keine Live-Geheimnisse.
- POC-Standard seit 01.11.2026: normale Änderungen direkt nach main committen und pushen. Die Nutzerin muss weder Push noch Veröffentlichung erneut bestätigen. Bestehende Branchschutzregeln nicht ändern; falls sie einen PR erzwingen, übernimmt der Agent diesen Weg vollständig.
- Push nach main: denselben Prüfweg ausführen, ausschließlich dist als Pages-Artefakt hochladen, den aktuellen main-Stand prüfen und veröffentlichen.
- Vor Veröffentlichung fehlgeschlagene Prüfungen verändern die ausgelieferte Version nicht. GitHub Pages bietet keinen eigenen privaten Produktionskandidaten; deshalb Browser-Smoke-Tests am gebauten Artefakt vor dem Deploy und HTTP-/Commitprüfung nach dem Deploy.
- Die nachgelagerte Liveprüfung erkennt fehlende Assets oder eine falsche Commit-Version. Ein erkannter Fehler nach dem Deploy erfordert eine Rücknahme; eine automatische Rücknahme ist in dieser Grundversion noch nicht implementiert und darf nicht behauptet werden.
- Wiederherstellung: Fehlercommit mit git revert als normalen main-Commit zurücknehmen; falls Branchschutz einen PR verlangt, diesen selbst abwickeln. Wenn main selbst keinen funktionsfähigen Build mehr erlaubt, den bekannten grünen Stand durch geprüfte Korrektur herstellen. Kein force-push und kein Löschen gespeicherter Inhalte.
- Agent muss auf alle Jobs einschließlich Publish und Liveprüfung warten. Grün für Build allein genügt nicht.
- Releasekennung: version.json enthält den exakten Git-Commit. Der Agent prüft ihn gegen den gerade veröffentlichten main-Commit.
- Standardprüfung lokal: npm run verify. Liveprüfung: EXPECTED_SHA=<voller Commit> npm run verify:live.
- In der separat gestarteten Cloud-Einrichtung unter Damians Konto bestanden Build und acht Chromium-Tests. WebKit konnte dort mangels Administratorrechten nicht eingerichtet werden; deshalb übernimmt die verpflichtende GitHub-Prüfung beide Browser. Die Cloud-Konfiguration muss vor Nutzung noch gespeichert und veröffentlicht werden.

## Kosten und Grenzen

- Öffentliches GitHub-Repository und Standard-Actions für die Prüfstrecke. GitHub-Pages- und Kontingentbedingungen gelten; keine Zusage unbegrenzter Ressourcen.
- Die App verwendet keine kostenpflichtige KI-API. Das ChatGPT-Kontingent der Entwicklerin ist getrennt vom App-Hosting.
- Cloud-Account-Einrichtung, ihr GitHub-Name, tatsächlicher iPhone-Test und spätere Backendwahl bleiben bis zur Prüfung offen.

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
