# MOBIMORY 1.1.0.1-dev – Komponenten/Fahrzeug-Zuordnung sichtbar

Basis: sauberer 1.1.0.0-Rebuild auf 1.0.6.15.

## Änderung
In der Komponentenliste und in der Maske einer neuen/bestehenden Komponente wird oben eindeutig angezeigt, zu welchem Fahrzeug die Komponente gehört:

- Zugeordnetes Fahrzeug
- Fahrzeug: <Fahrzeugname>
- darunter das Fahrzeugprofil, sofern vorhanden

Die technische Zuordnung bleibt unverändert automatisch über `FahrzeugId`. Es gibt kein zusätzliches Fahrzeug-Auswahlfeld und keine Änderung am Datenmodell.

## Installation
ZIP lokal entpacken und die entpackten Dateien in das bestehende GitHub-Repository hochladen. `index.html` ersetzen. `patch-1.1.0.1.js` zusätzlich hochladen.

Kein neues Microsoft-365-Setup erforderlich.
