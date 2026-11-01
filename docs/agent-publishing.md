# Veröffentlichung auf GitHub

Pflichtlektüre vor jedem Push nach main.

- Neue Änderungen landen auf main. Den aktuellen Stand zuerst holen, vorhandene fremde Änderungen erhalten und die eigenen Änderungen normal committen und pushen. Kein Force-Push. Falls bestehender Branchschutz technisch einen PR verlangt, diesen selbst erstellen und nach erfolgreichen Pflichtprüfungen selbst mergen beziehungsweise Auto-Merge nutzen; keine manuelle Arbeit der Nutzerin verlangen und keinen Schutz abschalten.
- Änderungen an Prüfregeln, bestehenden Zugriffen, Geheimnissen und zerstörerischen Datenoperationen brauchen Damians ausdrücklichen Auftrag. Unklare Freigaben nicht aus einer normalen Featurebitte ableiten.
- Nach dem main-Push auf den Workflow „Check and publish“ einschließlich Veröffentlichung und Liveprüfung warten. Build-Erfolg allein genügt nicht.
- Prüfe den aktuellen main-Commit gegen version.json an der festen App-Adresse. Alternativ EXPECTED_SHA=<Commit> npm run verify:live verwenden. Auch die ausgelieferten JS-/CSS-Dateien müssen erreichbar sein.
- Wenn Veröffentlichung nicht möglich ist, den geprüften Commit/PR erhalten, ihr den Stand in Alltagssprache sagen und den Weiterleitungstext für Damian geben. Kein „fertig“ behaupten.
- Erledigte Änderungen in CHANGELOG.md festhalten. Technischen Stand in docs/architecture.md und offene Einrichtung in docs/owner-setup.md korrekt halten.
- Prüfungen laufen vor dem Pages-Deploy. Eine automatische Rücknahme nach einem fehlgeschlagenen Livecheck ist noch nicht eingerichtet; keinen solchen Schutz behaupten.
