# Daten später featureübergreifend verknüpfen

Lesen vor neuen Datenmodellen, Migrationen, Auswertungen oder automatischen Ereignissen.

- Bei Architektur- und Datenmodellentscheidungen immer berücksichtigen: Später können sehr viele Daten aus unterschiedlichen App-Quellen und Features flexibel miteinander verknüpft, gemeinsam ausgewertet und als Grundlage automatisch ausgelöster Ereignisse verwendet werden.
- Dafür nachvollziehbare, stabile Identitäten und klare Beziehungen vorsehen. Herkunft, Bedeutung und relevante Zeitpunkte eines Datensatzes erhalten; Datentypen, Einheiten und Zeitbezug eindeutig halten, soweit sie für das aktuelle Feature anfallen. Keine Verknüpfung allein über veränderbare Anzeigenamen oder zufällig passende Texte aufbauen.
- Fachliche Daten von ihrer Darstellung trennen. Feature-Grenzen und Datenzugriffe so klar halten, dass spätere Auswertungen passende Daten kombinieren können, ohne UI-Code auszulesen oder Geschäftslogik zu duplizieren. Querverbindungen ausdrücklich modellieren, wenn der konkrete Anwendungsfall entsteht.
- Datenerfassung, abgeleitete Auswertungen und daraus ausgelöste Aktionen getrennt halten. Automatische Aktionen bei ihrer tatsächlichen Einführung nachvollziehbar und gegen doppelte Ausführung absichern; Wiederholungen dürfen keine unbeabsichtigten Mehrfachwirkungen erzeugen.
- Verknüpfungen und Auswertungen respektieren dieselbe Personen-/Paarzugehörigkeit und fachliche Sichtbarkeit wie die Quelldaten. Eine neue Verknüpfung darf keinen indirekten Zugriff auf fremde oder persönliche Inhalte ermöglichen. Nur benötigte Daten speichern; keine zusätzlichen persönlichen Informationen bloß für mögliche spätere Analysen sammeln.
- Diese Leitlinie schafft Anschlussfähigkeit, keinen Vorratsauftrag: KISS und YAGNI gelten weiter. Jetzt weder generischen Event-Bus noch Regel-Engine, Data Warehouse, universelles Datenmodell oder zusätzliche Infrastruktur einführen, solange kein konkreter beauftragter Nutzen das erfordert.
