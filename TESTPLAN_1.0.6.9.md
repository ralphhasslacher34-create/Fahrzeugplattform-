# Testplan MOBIMORY 1.0.6.9 — Mehrfachrouten + Wetterfenster

## A — Installation / Schema

1. Dateien ins bestehende Repository übernehmen.
2. Prüfen: `index.html` lädt `patch-1.0.6.9.js` nach 1.0.6.8.
3. M365 Setup ausführen.
4. Prüfen: Liste `NutzungsRoutenabschnitte` wurde angelegt.
5. Bestehende Nutzungen, Wetterdaten und GPSPunkte bleiben vorhanden.

## B — Grobroute

1. Geplante mehrtägige Nutzung öffnen.
2. Gesamt-/Grobroute als GPX importieren.
3. Prüfen: Dateiname, Stützpunktzahl und Gesamtstrecke sichtbar.
4. Prüfen: Grobroute erzeugt nicht automatisch die operative Wettervorschau.
5. Grobroute entfernen: Routenabschnitte dürfen nicht gelöscht werden.

## C — Mehrere Routenabschnitte

1. GPX 1 als Abschnitt hinzufügen.
2. GPX 2 als weiteren Abschnitt hinzufügen.
3. Prüfen: beide Abschnitte bleiben separat erhalten.
4. Dritten Abschnitt hinzufügen.
5. Namen ändern.
6. Reihenfolge mit ↑/↓ ändern.
7. Einen Abschnitt löschen: übrige Abschnitte und Grobroute bleiben erhalten.
8. Nutzung schließen/neu öffnen: Abschnitte müssen aus SharePoint wieder geladen werden.

## D — Vorstart-Wetterfenster

1. Abschnitt auswählen.
2. Prüfen: ETA-Basis ist V Reise manuell.
3. Startzeit z. B. morgen 10:00 einstellen.
4. `Wetter für diese Startzeit` wählen.
5. Prüfen: Wetter wird entlang genau dieses Abschnitts zu den berechneten ETA angezeigt.
6. `+1 h` drücken: ETA/Wetter muss sofort für die verschobene Startzeit neu berechnet werden.
7. `−1 h` entsprechend testen.
8. Prüfen: bloßes Testen verändert die gespeicherte geplante Startzeit nicht.
9. `Als geplante Startzeit speichern` wählen und Nutzung neu öffnen: Zeit muss erhalten sein.
10. Ziel muss immer als letzter Punkt mit ETA + Wetter erscheinen.

## E — Persönliche Wetterlogik

1. Regel `alle 10 km` testen.
2. Regel `alle 10 sm` testen.
3. Regel `jede 1 Stunde` testen.
4. Regel ändern: importierte GPX muss unverändert bleiben.
5. Ziel bleibt unabhängig vom Raster vorhanden.

## F — Aktueller Routenabschnitt während Fahrt

1. Nutzung starten.
2. Einen Abschnitt `Für aktuelle Fahrt verwenden` markieren.
3. Cockpit öffnen.
4. Prüfen: ETA/Wetter und Abweichungsprüfung beziehen sich auf diesen Abschnitt, nicht auf die Grobroute und nicht auf einen anderen Abschnitt.
5. Anderen Abschnitt als aktuell markieren: Cockpit muss danach diesen verwenden.

## G — GPS / reale ETA

1. GPS-Freigabe erteilen.
2. Aktuelle Geschwindigkeit muss erscheinen.
3. Nach ausreichender Bewegung muss ETA-Basis von V Reise auf realen Fahrdurchschnitt wechseln.
4. Standzeit darf den Fahrdurchschnitt nicht herunterziehen.
5. Ziel-ETA muss sich bei anderer realer Geschwindigkeit entsprechend verschieben.

## H — Abweichungswarnung

1. kleinen Grenzwert einstellen.
2. vom aktuellen GPX-Routenabschnitt entfernen.
3. Prüfen: Warnung zeigt Abstand und `Bitte Route/Kurs überprüfen.`
4. Es darf keine Lenk-, Richtungs-, Abbiege- oder Kurskorrekturanweisung erscheinen.

## I — Regression

- 1.0.6.8 Fahrzeuggeschwindigkeiten bleiben erhalten.
- GPS-Speedometer bleibt erhalten.
- Wasser-Wetter 1.0.6.7 bleibt erreichbar.
- manuelle Wettererfassung bleibt nutzbar.
- normale Nutzungsplanung bleibt nutzbar.
- Wasserski unverändert.
- Motor/BH unverändert.
- Tanken/Versorgung unverändert.
