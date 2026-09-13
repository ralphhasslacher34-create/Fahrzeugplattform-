# MOBIMORY 1.0.6.12-dev – Kartenfix

Basis: 1.0.6.11-dev.

## Behoben
- Die GPX-Route wird auf der Leaflet/OpenStreetMap-Karte wieder als Linie sichtbar.
- Leaflets internes SVG wird nicht mehr von der Fallback-Grafik-CSS auf die komplette Kartenfläche verzerrt.
- Das fehlerhafte große Rechteck in der Karte verschwindet.
- Route: klare blaue Linie.
- Start: grün.
- Ziel: dunkel.
- aktuelle GPS-Position: rot.
- Wetterpunkte: orange.

## Unverändert
- Cockpit-Aufbau aus 1.0.6.11.
- GPX-Daten und Routenabschnitte.
- ETA-/Wetterlogik.
- GPS-Speedometer innerhalb des gemeinsamen Bereichs „Unterwegs“.
- SharePoint-Schema.

## Installation
Die ZIP lokal entpacken und die enthaltenen Dateien in das bestehende GitHub-Repository hochladen. `index.html` ersetzen. Wichtig sind insbesondere:
- `patch-1.0.6.12.js`
- `index.html`
- `index-1.0.6.12.html`

Kein Microsoft-365-Setup erforderlich.

Nach dem Neuladen muss unten links `1.0.6.12-dev` stehen.
