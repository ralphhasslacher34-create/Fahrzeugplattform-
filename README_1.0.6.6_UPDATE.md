# MOBIMORY 1.0.6.6-dev – Törn / Planung Fix

Dieses Update baut auf **1.0.6.5-dev** auf und ändert ausschließlich die Start-/Planungslogik.

## Korrekturen

1. **Törn – doppeltes Startdatum entfernt**
   - Das zusätzliche Startdatum aus 1.0.6.4 bleibt nur für die kompakten Nutzungen Ausfahrt/Wasserski.
   - Törn verwendet nur seine vorhandenen Planungsfelder.

2. **Offene Ausfahrt blockiert Zukunftsplanung nicht mehr**
   - Eine aktuell aktive Ausfahrt ohne Enddatum wird bei einer zukünftigen Planung als weicher Konflikt behandelt.
   - Die Planung kann gespeichert werden und wird sichtbar als "unter Vorbehalt" gemeldet.
   - Andere echte Überschneidungen bleiben harte Konflikte.
   - Beim tatsächlichen Start bleibt die vorhandene harte Verfügbarkeitsprüfung unverändert. Läuft die Ausfahrt dann noch, kann der Törn nicht gestartet werden.

3. **Neuen Ort anlegen ohne Datenverlust**
   - "+ neuen Ort anlegen" baut die Start-/Planungsmaske nicht mehr neu auf.
   - Startort, Zielort, Startdatum, Enddatum und bereits eingegebene Werte bleiben erhalten.
   - Der neue Ort wird direkt in die aktuell sichtbaren Ortslisten eingefügt und im gewählten Feld ausgewählt.

## Nicht geändert

- Ausfahrt-Cockpit
- Wasserski-Cockpit
- Motor-/BH-Logik
- Tanklogik
- Wasserski-Runs
- SharePoint-Schema

## Installation

Im bestehenden Repository:

1. `index.html` ersetzen.
2. `index-1.0.6.6.html` neu hinzufügen (optional als Versionskopie).
3. `patch-1.0.6.6.js` neu hinzufügen.
4. Alle älteren Patch-Dateien behalten.

**Kein Microsoft-365-Setup erforderlich.** 1.0.6.6 enthält keine Schemaänderung.
