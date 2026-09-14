# MOBIMORY 1.1.0.1-dev – Stammdaten Legacy-UI Fix

## Zweck
1.1.0.1 ist ein reiner Fix auf 1.1.0.0.

Die neue Stammdatenstruktur 1.1–1.6 / 2.1–2.7 war bereits vorhanden, wurde aber unterhalb der alten Fahrzeugkonfiguration angehängt. Dieser Fix blendet die komplette alte Fahrzeugkonfiguration in dieser Ansicht aus und zeigt nur noch die neue Stammdatenstruktur.

## Wichtig
- Keine Daten werden gelöscht.
- Alte Listen und alte Testwerte bleiben technisch erhalten.
- `GPS Intervall`, `Längeneinheit`, alte Prüf-/Austausch-/Merkmalsblöcke usw. werden in der Fahrzeug-Stammdatenansicht nicht mehr angezeigt.
- Kein neues Microsoft-365-Setup nötig.

## Installation
1. ZIP lokal entpacken.
2. Die entpackten Dateien in das bestehende GitHub-Repository hochladen.
3. `index.html` ersetzen.
4. `patch-1.1.0.1.js` muss im Repository liegen.
5. App neu laden; unten muss `1.1.0.1-dev` stehen.
