# Testplan MOBIMORY 1.0.6.2-dev

Ziel ist ein kurzer Regressionstest genau der Änderungen von 1.0.6.2.

## A – Microsoft-365-Schema
1. MOBIMORY öffnen.
2. Einstellungen / Daten → Microsoft 365 Setup.
3. `Phase-1-Struktur prüfen / anlegen` ausführen.

**Erwartung:** Setup wird ohne Fehler abgeschlossen; vorhandene Daten bleiben bestehen.

## B – Geplante Nutzung anlegen
1. Eine mehrtägige Nutzung auswählen.
2. Namen vergeben, z. B. `Wochenende Test`.
3. Start und Ende mit Datum/Uhrzeit eingeben.
4. Startort, mindestens ein Zwischenziel und Ziel wählen.
5. Planung speichern, noch nicht starten.

**Erwartung:** Nutzung erscheint als geplant und kann erneut geöffnet/bearbeitet werden. Es wird noch kein neuer Start-Zählerstand erzeugt.

## C – Zeitlogik
1. In einer Planung Ende vor oder gleich Start setzen.

**Erwartung:** Speichern/Start wird blockiert. Das Ende muss mindestens eine Minute nach dem Start liegen.

## D – Tatsächlicher Start / Zähler
1. Eine geplante Nutzung starten.
2. Die vorgeschlagenen Zählerstände prüfen und bestätigen.

**Erwartung:** Erst jetzt entstehen Start-Messwerte. Ein Wert kleiner als der zuletzt bekannte Stand verlangt eine Begründung.

## E – Motorstatus Motorboot
Voraussetzung: mindestens zwei aktive Motor-Komponenten, die als Antriebsmotor erkannt werden.

1. Nutzung tatsächlich starten.
2. Cockpit öffnen.
3. Einen Motor stoppen.
4. Den Motor wieder starten.
5. Anlegen/Ankern.

**Erwartung:**
- nach Nutzungsstart: beide Motoren laufen,
- nach Einzel-Stopp: genau dieser Motor steht,
- nach Einzel-Start: er läuft wieder,
- nach Anlegen/Ankern: alle laufenden Antriebsmotoren stehen.

Jede Änderung muss als Ereignis mit Zeitpunkt und Motorbezug gespeichert sein.

## F – Reisecheck einer eindeutig nationalen Route
1. Geplante Nutzung mit vollständig aufgelösten Wegpunkten nur innerhalb eines Landes auswählen.
2. Online-Recherche starten.

**Erwartung:** Keine erfundene Schengen-/Grenzquerung und keine ausländischen Einreiseanforderungen allein aufgrund hypothetischer Umwege.

## G – Worker-Version
`https://mobimory-research.ralphhasslacher34.workers.dev/health` öffnen.

**Erwartung:** Antwort enthält `"serviceVersion":"1.0.6.2"`.

## Abbruchkriterium
Bei einem Fehler in B–F nicht weiter ausbauen. Den konkreten Fehler korrigieren und denselben Test wiederholen.
