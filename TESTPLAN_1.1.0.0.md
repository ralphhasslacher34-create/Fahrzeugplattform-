# Testplan MOBIMORY 1.1.0.0-dev

1. Microsoft-365-Setup einmal ausführen. Keine Fehlermeldung; Liste `Komponenten1100` muss angelegt/erreichbar sein.
2. Fahrzeug öffnen → Konfiguration. Sichtbar ist genau ein neuer Bereich **Stammdaten** mit Tabs **Fahrzeug** und **Komponenten / Ausrüstung**.
3. Der alte Hauptbereich **Eigenschaften** soll nicht mehr sichtbar sein. Der alte separate Block **Geschwindigkeit / ETA-Grundlage** soll nicht zusätzlich sichtbar sein.
4. Fahrzeug → 1.1 bis 1.6 öffnen, Werte eintragen, speichern, Seite neu öffnen. Werte müssen erhalten bleiben.
5. Boot: LWL eintragen → Rumpfgeschwindigkeit wird berechnet angezeigt. Sie ist kein eigenes Eingabefeld.
6. Registrierung hinzufügen, speichern, neu öffnen. Art/Land/Nummer/Fristen/Erneuerungsart prüfen.
7. Fester Standort hinzufügen, speichern, neu öffnen.
8. Komponente anlegen: Typ → Bezeichnung → Position → Hersteller/Modell/Seriennummer.
9. In derselben Komponentenmaske technische Merkmale, Wartungsregel, Kostenstatus und Dokument-Metadaten hinzufügen. Einmal speichern; danach erneut öffnen und prüfen.
10. Zweite Komponente anlegen und anschließend bei der ersten unter 2.3 eine Verbindung zur zweiten anlegen.
11. Baugruppe testen: Eltern-/Unterkomponenten-Zuordnung setzen.
12. Kostenstatus `im Fahrzeug enthalten` prüfen: Kaufpreis darf leer bleiben; leer bedeutet nicht „Wert 0“.
13. Regression: Start / Planung / Törn / Cockpit / Route / Wetter aus 1.0.6.15 weiterhin öffnen.
