# Testplan MOBIMORY 1.0.6.7

## A – Orte

1. Törn/Reise-Planung öffnen.
2. In Startort nur 2–3 Buchstaben eingeben.
3. Prüfen: maximal 8 passende Treffer, keine komplette Ortsliste.
4. Ort wählen; Standortauswahl muss weiterhin funktionieren.
5. Zielort und Zwischenziel genauso testen.
6. `+ neuen Ort anlegen` testen: vorhandene Datum-/Ortseingaben dürfen nicht verschwinden.
7. Maske neu öffnen: zuletzt verwendeter Ort sollte bei leerer Suche weit oben erscheinen.

## B – Personen

1. Nutzung mit vielen Personen öffnen.
2. Primärperson über Suchfeld finden und wählen.
3. Crew/Gäste über Suchfeld filtern.
4. Mehrere Personen auswählen.
5. Suchtext ändern: ausgewählte Personen müssen sichtbar/ausgewählt bleiben.
6. Primärperson darf weiterhin nicht gleichzeitig Crew/Gast sein.

## C – Wohnmobil

1. Wohnmobil auswählen.
2. Prüfen: nur `Reise` und `Spontanfahrt` werden angeboten.
3. Reise öffnen: geplante Start-/Enddaten sowie Start-/Zielort vorhanden.
4. Spontanfahrt öffnen: Startdatum + Startort vorhanden, kein Ziel und kein Enddatum.
5. Spontanfahrt starten und offen lassen.
6. Zukünftige Reise planen: Planung muss unter Vorbehalt speicherbar sein.
7. Geplante Reise tatsächlich starten, solange Spontanfahrt aktiv: Start muss gesperrt sein.

## D – Wasser-Wetter

1. Motorboot-Nutzung öffnen und Wetter aus dem Cockpit aufrufen.
2. GPS zulassen.
3. Prüfen: Wasser-Wetter-Karte erscheint oberhalb der manuellen Wettererfassung.
4. Nacheinander `Jetzt`, `+1 h`, `+2 h`, `+3 h`, `+6 h`, `+12 h`, `+24 h` wählen.
5. Prüfen: immer nur ein Zeitdatensatz sichtbar.
6. Wind, Böen, Richtung, Regen, Sicht, Luftdruck und Gewitterhinweis prüfen.
7. Auf Binnensee: fehlende Marinewerte dürfen keinen Fehler verursachen.
8. Manuelle Wettererfassung darunter muss weiterhin speicherbar sein.

## E – Regression

- Ausfahrt-Cockpit unverändert.
- Wasserski: Motor Start/Stop, BH, Ablegen, Runs, Anlegen unverändert.
- Törn: nur ein Startdatum.
- Neuer Ort löscht weiterhin keine Planungsdaten.
