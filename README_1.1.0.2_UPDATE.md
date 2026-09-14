# MOBIMORY 1.1.0.2-dev – Stammdaten Render-Fix

Basis: **1.1.0.0-dev**. Der fehlerhafte 1.1.0.1-Stand ist **nicht** Bestandteil dieses Pakets.

## Ursache

Bis 1.1.0.0 rief `vehicleconfigure()` weiterhin die komplette alte Konfigurationskette auf. Erst danach wurde die neue Stammdatenansicht 1.1–1.6 / 2.1–2.7 angehängt. Dadurch erschien die alte Konfiguration vor der neuen.

1.1.0.1 versuchte die bereits gerenderte Legacy-Oberfläche nachträglich auszublenden und griff dabei zu weit. Dieser Ansatz wird verworfen.

## Fix 1.1.0.2

- `vehicleconfigure()` rendert **nicht mehr** über die alte Konfigurationskette.
- Beim Öffnen wird die Arbeitsfläche geleert und ausschließlich die neue Stammdatenansicht geladen.
- Kein CSS-Hide und kein nachträgliches Verstecken von Legacy-Containern.
- Die neue Struktur aus 1.1.0.0 bleibt unverändert.
- Daten werden nicht gelöscht.
- Kein neues Microsoft-365-Schema gegenüber 1.1.0.0.

## Installation

1. ZIP lokal entpacken.
2. Entpackten Inhalt in das bestehende GitHub-Repository hochladen.
3. `index.html` ersetzen.
4. `patch-1.1.0.2.js` muss im Hauptverzeichnis liegen.
5. App neu laden; unten muss `1.1.0.2-dev` stehen.
6. Wenn das 1.1.0.0-Microsoft-365-Setup bereits erfolgreich ausgeführt wurde, ist **kein erneutes Setup** nötig.

## Erwartetes Ergebnis

`Fahrzeug konfigurieren` beginnt direkt mit **Stammdaten** und den Tabs **Fahrzeug** / **Komponenten / Ausrüstung**. Davor dürfen keine alten Komponenten-, Eigenschaften-, Prüfungs-, Austausch- oder Geschwindigkeitsblöcke erscheinen.
