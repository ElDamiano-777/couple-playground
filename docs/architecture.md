# Kleine Architektur

- React, TypeScript und Vite. Keine UI-Bibliothek, kein Router und keine bezahlte API für die Grundversion nötig.
- GitHub Pages unter /couple-playground/. Alle Ansichten liegen auf der Startadresse; Unterseiten verursachen keine SPA-404-Probleme auf Pages.
- src/App.tsx enthält drei einfache Ansichten. src/storage.ts speichert ausschließlich lokale Notizen unter einem versionierten Browser-Schlüssel.
- app.config.json ist die Quelle für App-Adresse, Basis-Pfad und Repository. Bei Umbenennung auch Manifest und Tests synchron ändern.
- public enthält App-Symbole, Webmanifest und Offline-Hinweis. PNG-Symbole werden reproduzierbar aus scripts/generate-icons.py erzeugt.
- Service Worker wird beim Build mit einer Commit-Kennung erzeugt. Er hält ausschließlich den statischen Offline-Hinweis vor. Dokumentnavigation bleibt online-first; andere Anfragen werden nicht abgefangen.
- Keine automatische Aktivierung mit skipWaiting und keine erzwungene Aktualisierung während offener Eingaben. Neue Version wird beim Öffnen/Fokussieren anhand version.json erkannt; eine offene Notiz blockiert den Aktualisierungsbutton.
- Browser-Smoke-Tests prüfen beide Engines, Speichern/Neuladen, defekten/vollen Speicher, als Text gerenderte Notizen, App-Assets, Offline-Navigation und ungespeicherte Eingaben bei Updates.
- Workflow testet das gebaute Artefakt, veröffentlicht nach erfolgreicher Prüfung und kontrolliert danach die ausgelieferte Commit-Kennung und JS-/CSS-Dateien.
- Kein Backend eingerichtet. Es gibt keine scheinbare Paarverbindung. Ein späterer Backend-Schritt wird in Issue #1 anhand serverseitiger Positiv- und Negativtests dokumentiert.
- Technische und fachliche Ziele nicht vermischen: neue Spiel-/Fragen-/Trackingfunktionen erst auf Wunsch entwickeln.
