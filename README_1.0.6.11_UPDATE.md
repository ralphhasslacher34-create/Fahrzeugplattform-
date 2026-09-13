# MOBIMORY 1.0.6.11-dev – UI-Bereinigung Block 1

Dieses Update bereinigt ausschließlich die Darstellung von Block 1. Es gibt **keine neue SharePoint-Struktur** gegenüber 1.0.6.9.

## Ziel

Die mehrfachen GPS-Speedometer- und Route/ETA/Wetter-Blöcke werden entfernt. Zusammengehörige Informationen stehen zusammen.

### Planung / Nutzung öffnen
Es gibt genau einen Bereich **„Route & Wetterplanung“** mit:
- ausgewähltem Routenabschnitt
- Karte
- fiktiver Startzeit / Wetterfenster
- ETA-/Wetterpunkten
- Routenabschnitten, Wegpunkten und Wetterregel als eingeklappte Werkzeuge

### Laufende Nutzung / Cockpit
Es gibt genau einen Bereich **„Unterwegs“** mit:
- GPS-Speed
- realem Fahrdurchschnitt
- Reststrecke
- ETA Ziel
- Karte / aktuelle Route
- Routenwetter

Ein separater GPS-Speedometer wird nicht mehr erzeugt.

### Wetteransicht
Die normale Wetter-/Logbuchansicht bleibt bestehen, erhält aber **keinen zusätzlichen Route/ETA/Wetter-Block** mehr.

### Wasserski
Der Block-1-Routenbereich wird im Wasserski-Cockpit nicht zusätzlich eingeblendet.

## Installation
1. ZIP lokal entpacken.
2. Den Inhalt in das bestehende Repository hochladen.
3. `index.html` ersetzen.
4. Die neuen Dateien `patch-1.0.6.11.js` sowie – falls im Repository noch nicht vorhanden – die enthaltenen Patches 1.0.6.8 bis 1.0.6.10 hochladen.
5. GitHub Pages neu laden. Falls der Browser noch alten Code zeigt: Seite einmal hart neu laden / Cache aktualisieren.

**Kein erneutes Microsoft-365-Setup nötig**, sofern die Struktur aus 1.0.6.9 bereits erfolgreich angelegt wurde.
