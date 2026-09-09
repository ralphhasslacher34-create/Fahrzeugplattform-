# Testplan MOBIMORY 1.0.6.3-dev

## A – Nutzungsname / Datum
1. Kurztrip mit Name `Bad Mergentheim Wochenende` planen.
2. Prüfen: Start/Dashboard zeigt zuerst diesen Namen.
3. Darunter: `LMC · Kurztrip`.
4. Darunter: geplanter Zeitraum, kein Erstellungsdatum.
5. Planungsfelder zeigen nur Datum, keine Uhrzeit.
6. Start = Ende am selben Tag muss möglich sein.
7. Ende vor Start muss blockiert werden.

## B – Personen
1. Tanja als Crew/Beifahrer auswählen.
2. Prüfen: Tanja kann gleichzeitig nicht als Gast gewählt werden.
3. Rolle wieder entfernen/ändern.
4. Danach muss die andere Rolle wieder auswählbar sein.
5. Dasselbe im Planungseditor und unter `Besatzung ändern` prüfen.

## C – Motorstart
1. Motorboot-Nutzung starten.
2. Erwartung: alle Motoren im Cockpit `Motor aus`.
3. `Ablegen` drücken.
4. Erwartung: alle konfigurierten Antriebsmotoren `Motor läuft`; je Motor entsteht ein Start-Ereignis mit Uhrzeit.

## D – Motor einzeln stoppen / Anlegen
1. Während beide Motoren laufen einen grünen Motorbutton drücken.
2. Erwartung: nur dieser Motor wird `Motor aus`; der andere bleibt `Motor läuft`.
3. `Anlegen` drücken und Aufenthalt speichern.
4. Erwartung: Fahrt ist beendet; noch laufender Motor bleibt weiter `Motor läuft`.
5. Danach den noch laufenden Motor über seinen grünen Button ausschalten.
6. Erwartung: eigener Stop-Zeitpunkt für jeden Motor.

## E – Ereignis-Historie
Nutzungsdetail öffnen. Erwartete Darstellung ungefähr:

- `Ablegen` · 11:23 · 09.09.2026
- `Motor BB gestartet` · 11:23 · 09.09.2026
- `Motor STB gestartet` · 11:23 · 09.09.2026
- `Motor STB gestoppt` · 11:30 · 09.09.2026
- `Anlegen` · 11:31 · 09.09.2026
- `Motor BB gestoppt` · 11:34 · 09.09.2026

Nicht sichtbar sein dürfen technische Zeilen wie `Kontext · Ereignis`.

## Abbruchkriterium
Wenn A–E nicht sauber funktionieren, zuerst 1.0.6.3 korrigieren und keine neuen Funktionen ergänzen.
