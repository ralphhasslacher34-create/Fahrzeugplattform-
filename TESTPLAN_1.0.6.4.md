# MOBIMORY 1.0.6.4-dev – Praxistest

## 1. Setup / Datenmodell
- Microsoft-365-Setup einmal ausführen.
- Prüfen, dass `Tankmodelle1064` und `WasserskiSetups1064` angelegt werden.
- Prüfen, dass bestehende Nutzungen/Runs unverändert vorhanden sind.

## 2. Ausfahrt – Start
- Motorboot → Ausfahrt wählen.
- Prüfen: Startdatum sichtbar.
- Prüfen: Startpunkt vorhanden, kein geplantes Ziel erforderlich.
- Skipper / Mitreisende auswählen.
- BH je Motor prüfen und bestätigen.
- Ausfahrt starten.

## 3. Motoren / BH
- Cockpit direkt nach Nutzungsstart: Motoren müssen AUS sein.
- Motor BB starten: Zeit/GPS und Motorereignis prüfen.
- Nach einigen Minuten: theoretischer BH und Laufzeit müssen hochlaufen.
- Motor STB separat starten.
- Einen Motor stoppen: Meldung mit Tageslaufzeit und theoretischem BH prüfen.
- Motor erneut starten und später stoppen: kumulierte Tageslaufzeit muss stimmen.
- Ablegen darf keinen Motor automatisch starten.

## 4. Ablegen / Anlegen
- Ablegen drücken: Zeitpunkt/GPS prüfen.
- Anlegen drücken: Zeitpunkt/GPS-Kontext prüfen und Aufenthalt speichern.
- Erneut Ablegen/Anlegen: mehrere Abschnitte derselben Nutzung müssen erhalten bleiben.

## 5. Tagesabschluss
- Tagesabschluss öffnen.
- BH-Endstände müssen mit theoretischen Werten vorbelegt sein.
- Abschluss ohne Bestätigung muss gesperrt sein.
- Tatsächliche Werte bestätigen oder korrigieren und speichern.

## 6. Tank
- Tankdaten erstmals setzen: Kapazität, aktueller Inhalt, Verbrauch l/Motor-BH.
- Cockpit: Tankbalken + Prozent prüfen.
- Motorlauf erzeugen und Tankstand erneut öffnen: rechnerische Abnahme prüfen.
- Tanken: Liter + Gesamtkosten eingeben; Preis/l prüfen.
- Danach Tankanzeige prüfen: getankte Menge muss berücksichtigt sein.

## 7. Wasserski – Start
- Motorboot → Wasserski wählen.
- Prüfen: Startdatum, Skipper, Crew/Gäste und BH-Bestätigung vorhanden.
- Prüfen: kein Start-/Zielplanungsblock und kein Tierblock.
- Nutzung starten.

## 8. Wasserski-Cockpit
- Reihenfolge prüfen: Abfahrtskontrolle → Tank → Motoren → Ablegen/Anlegen → Runs → Foto/Film/Wetter/Ereignis.
- Prüfen: kein Besatzungsbutton, kein Tagesabschluss.

## 9. Wasserski-Setup
- Läufer wählen, z. B. Fabian.
- Disziplin Monoski wählen.
- Neues Setup mit Leinenlänge, Ski, Speed, rpm eingeben.
- Prüfen: Werte werden vor dem Start sichtbar zusammengefasst.
- Run starten und beenden.
- Nach dem Run „Als zusätzliches Setup“ speichern.
- Nächsten Run: gleicher Läufer + gleiche Disziplin → gespeichertes Setup muss angeboten werden.
- Werte ändern und „Setup überschreiben“ testen.
- Zweites Setup mit anderer Leinenlänge speichern; beide müssen auswählbar sein.

## 10. GPS der Runs
- Run starten: GPS-Start muss im Run gespeichert werden.
- „Weitere Etappe / Wechselpunkt“ drücken: End-GPS der alten und Start-GPS der neuen Etappe prüfen.
- Run beenden: Run-End-GPS und Etappen-End-GPS prüfen.
- Historisch sicherstellen, dass jeder GPS-Satz über Run-ID/Läufer-ID eindeutig dem Läufer zugeordnet bleibt.

## 11. Regression 1.0.6.3
- Nutzungsstart startet keine Motoren.
- Personen-Doppelbelegung bleibt verhindert.
- Planung/Datumsfelder anderer Nutzungsarten funktionieren weiterhin.
- Historie und Nutzungsname funktionieren weiterhin.
