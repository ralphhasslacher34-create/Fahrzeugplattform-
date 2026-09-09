# MOBIMORY 1.0.6.3-dev – Update

## Enthalten

Dieses Paket ist ein kleines Root-Update auf Basis der bereits installierten **1.0.6.2 FIX1**.

Neu/Korrigiert:

- Nutzungsname steht in Start/Dashboard und Historie an erster Stelle.
- Darunter stehen Fahrzeug + Nutzungsart; bei Planungen wird der **geplante Zeitraum** angezeigt, nicht das Erstellungsdatum.
- Planungsfelder sind wieder reine Datumsfelder. Ein Tagestrip mit gleichem Start-/Enddatum ist gültig; Ende vor Start bleibt gesperrt.
- Tatsächliche Ereignisse behalten weiterhin exakte Zeitstempel mit Datum + Uhrzeit.
- Eine Person kann innerhalb derselben aktuellen Nutzungsauswahl nicht gleichzeitig z. B. Crew/Beifahrer und Gast sein. Das gilt auch beim Planungseditor und bei Besatzungsänderungen.
- **Nutzung starten** und **Nutzung fortsetzen** starten keine Motoren.
- Beim Motorboot startet **Ablegen** alle konfigurierten Antriebsmotoren gemeinsam.
- Im Cockpit hat jeder laufende Motor nur einen grünen **Motor läuft / Drücken = Motor aus**-Button. Ein ausgeschalteter Motor hat dort keinen Startknopf.
- **Anlegen** beendet die Fahrt mit dem bereits beim Cockpit-Tipp erfassten Zeit-/GPS-Kontext, stoppt die Motoren aber nicht automatisch.
- In der Nutzungs-Historie werden Motorereignisse konkret angezeigt, z. B. `Motor BB gestartet` / `Motor STB gestoppt`, jeweils mit Uhrzeit + Datum.
- Technische `Kontext · ...`-Rohereignisse werden aus der sichtbaren Ereignishistorie entfernt.

## Installation

Im bestehenden GitHub-Repository:

1. `index.html` ersetzen.
2. `index-1.0.6.3.html` neu hinzufügen (optional als Versionskopie, im Paket enthalten).
3. `patch-1.0.6.3.js` neu hinzufügen.
4. Die älteren Dateien **nicht löschen**. Insbesondere `patch-1.0.6.2.js` muss erhalten bleiben.

Die Dateien `README_1.0.6.3_UPDATE.md` und `TESTPLAN_1.0.6.3.md` sind nur Dokumentation.

## SharePoint / Cloudflare

- **Keine neuen SharePoint-Felder** gegenüber 1.0.6.2. Ein erneutes Microsoft-365-Setup ist für 1.0.6.3 nicht erforderlich, sofern 1.0.6.2 bereits erfolgreich eingerichtet wurde.
- **Keine Änderung am Cloudflare-Worker**. Der Research-Service aus 1.0.6.2 bleibt unverändert.

## Wichtig

Das Paket wurde statisch auf JavaScript-Syntax, Index-Scriptkette und ZIP-Integrität geprüft. Die echte Funktionsprüfung erfolgt anschließend in der GitHub-Pages-/SharePoint-Umgebung.
