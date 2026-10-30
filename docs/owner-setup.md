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
4. Node.js 24 bereitstellen; Setup-Skript: bash scripts/cloud-setup.sh. Netzwerkzugriff für npm und Playwright-Browserdownloads zulassen. Der Browser-Test-Webserver läuft nur innerhalb des Testsystems.
5. GitHub-Schreibzugriff für Branch, PR und Auto-Merge sowie lesenden Zugriff auf Actions-Ergebnisse prüfen. Keine Geheimnisse aus anderen Projekten hinzufügen.
6. Einmal einen kleinen Wunsch von ihrem eigenen iPhone aus diktieren, Commit/PR und automatische Veröffentlichung vollständig durchführen und den Live-Link prüfen.
7. Die App in Safari öffnen, „Teilen → Zum Home-Bildschirm“ verwenden. Installation und Aktualisierung auf dem echten Gerät prüfen.

## Datenstand

- Die veröffentlichte Grundversion verwendet ausschließlich lokalen Browser-Speicher. Die Oberfläche benennt das ausdrücklich.
- Ein browserlokaler Speicher kann durch Browserdaten-Löschung verloren gehen und ist auf gemeinsam genutzten Geräten nicht vor anderen Benutzern geschützt.
- Es gibt keine Anmeldung, keine Einladungslinks, keine Paar-Datenbank und keine Datenübertragung an einen Partner.
- Die zwei kostenlosen Supabase-Projektplätze des Eigentümers sind bereits ausgeschöpft. Kein bestehendes Projekt pausieren, löschen oder für diese App zweckentfremden.
- Für ein späteres Backend: separater Projektzugang beziehungsweise freigegebener Tarif, dokumentierter Zweck und Datenarten, Empfänger, Zugriffs-/Löschregeln, Aufbewahrung und gegebenenfalls Vereinbarungen. Rechtliche Rollen und Grundlagen sind nicht durch dieses Setup festgestellt.
- Vor echten Paar-Daten: zwei Konten, sichere ablaufende Einladungen, serverseitige Zugriffsregeln, direkte Negativtests mit fremdem Konto und Abmelde-/Löschpfade. Keine gemeinsamen Fake-Logins als Abkürzung.

## Prüf- und Veröffentlichungsweg

- PR: npm ci, Browserinstallation, Build und Smoke-Tests. Unvertrauenswürdige PRs bekommen keine Live-Geheimnisse.
- Auto-Merge auf aktuellem geprüftem Branch aktivieren. main erhält eine Pflichtprüfung; kein manueller Klick durch die Nutzerin vorgesehen.
- Push nach main: denselben Prüfweg ausführen, ausschließlich dist als Pages-Artefakt hochladen, den aktuellen main-Stand prüfen und veröffentlichen.
- Vor Veröffentlichung fehlgeschlagene Prüfungen verändern die ausgelieferte Version nicht. GitHub Pages bietet keinen eigenen privaten Produktionskandidaten; deshalb Browser-Smoke-Tests am gebauten Artefakt vor dem Deploy und HTTP-/Commitprüfung nach dem Deploy.
- Die nachgelagerte Liveprüfung erkennt fehlende Assets oder eine falsche Commit-Version. Ein erkannter Fehler nach dem Deploy erfordert eine Rücknahme; eine automatische Rücknahme ist in dieser Grundversion noch nicht implementiert und darf nicht behauptet werden.
- Wiederherstellung: Fehlercommit mit git revert über einen neuen geprüften PR zurücknehmen. Wenn main selbst keinen funktionsfähigen Build mehr erlaubt, den bekannten grünen Stand durch geprüfte Korrektur herstellen. Kein force-push und kein Löschen gespeicherter Inhalte.
- Agent muss auf alle Jobs einschließlich Publish und Liveprüfung warten. Grün für Build allein genügt nicht.
- Releasekennung: version.json enthält den exakten Git-Commit. Der Agent prüft ihn gegen den gerade veröffentlichten main-Commit.
- Standardprüfung lokal: npm run verify. Liveprüfung: EXPECTED_SHA=<voller Commit> npm run verify:live.

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
