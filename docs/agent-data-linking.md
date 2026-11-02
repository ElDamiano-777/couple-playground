# Datenmodelle im POC

Nur bei neuen Datenmodellen oder geänderten Beziehungen lesen.

- Nur Felder und Beziehungen für den aktuellen Wunsch modellieren. Bestehende Tabellen, Zugriffsmuster und Dienste verwenden, soweit passend.
- Stabile IDs statt veränderbarer Anzeigenamen als Beziehungen nutzen. Datentypen, Einheiten und Zeitbezug nur dort festlegen, wo das Feature sie braucht.
- Keine Architektur für spätere Verknüpfungen, Auswertungen, Automationen oder Skalierung vorbereiten. Zusätzliche Schichten und Infrastruktur erst bei einem konkreten Auftrag einführen.
- Der Smoke-Test prüft, ob sich die betroffenen Inhalte wie gewünscht speichern und wieder anzeigen lassen. Weitere Prüfungen nur bei einem konkreten Fehler; vorhandene Pflichtprüfungen bleiben bestehen.
