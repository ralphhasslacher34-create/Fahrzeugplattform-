# Testplan 1.1.0.0 – Stammdaten REBUILD

1. Version unten: `1.1.0.0-dev`.
2. Microsoft 365 Setup einmal ausführen.
3. Konfiguration → Fahrzeuge → **Neues Fahrzeug**.
   Erwartung: direkt die neue Maske 1.1–1.6. Kein alter Block „Fahrzeugmerkmale / Eigenschaften“ davor oder danach.
4. Testfahrzeug anlegen und speichern.
   Erwartung: dieselbe Maske bleibt für das nun bestehende Fahrzeug erhalten; Komponenten-Tab ist nutzbar.
5. Zur Fahrzeugliste zurück und dasselbe Fahrzeug erneut öffnen.
   Erwartung: exakt dieselbe 1.1–1.6-Maske, vorhandene Werte gefüllt.
6. Komponenten / Ausrüstung öffnen → Komponente anlegen.
   Erwartung: eine Maske mit 2.1–2.7.
7. Dynamisches technisches Merkmal hinzufügen und Komponente speichern.
8. Komponente erneut öffnen; Merkmal muss vorhanden sein.
9. Prüfen, dass weder `Weitere Fahrzeugmerkmale`, `GPS Intervall` noch `Längeneinheit` in der Fahrzeug-Stammdatenansicht erscheinen.
10. Danach erst weitere fachliche Detailtests durchführen.
