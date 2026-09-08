# MOBIMORY / Fahrzeugplattform 1.0.5.1-dev

Korrekturpaket auf Basis von 1.0.5-dev.

## Neu / korrigiert

- Werkstatt: Das zugeordnete Fahrzeug wird jetzt bei Störungen, Aufgaben, Wartungen, Prüfungen und Arbeiten sichtbar angezeigt.
- Wartungsplan: Das fehlende SharePoint-Feld `Testdaten` wird additiv ergänzt. Damit kann ein Wartungsplan im Testmodus wieder angelegt werden.
- Wohnmobil: Unter Fahrzeug → Ausrüstung / Technik → Fahrerlaubnis / fachliche Berechtigung kann die erforderliche Fahrerlaubnisklasse direkt ausgewählt werden: B, BE, C1, C1E, C oder CE.
- Ereignisarten: Neuer Stammdatenbereich unter Konfiguration → Ereignisarten.
  - Ereignisart anlegen
  - bearbeiten
  - aktiv/inaktiv setzen
  - unbenutzte Ereignisart löschen
  - bereits verwendete Ereignisart wird beim Entfernen nur deaktiviert
  - Zuordnung zu Allgemein, Motorboot oder Wohnmobil
  - bisherige Standardauswahl kann einmalig in den Stamm übernommen werden
- Neue Ereignisse speichern zusätzlich die stabile `EreignisartId`; der sichtbare Name bleibt als Momentaufnahme erhalten.
- Der automatische Online-Reisecheck ist weiterhin für 1.0.6-dev vorgesehen und bewusst nicht Bestandteil dieses Korrekturpakets.

## Installation

Die Dateien aus dem ZIP in das bestehende GitHub-Repository hochladen und vorhandene Dateien überschreiben, wenn GitHub danach fragt.

Neu hinzukommen:

- `patch-1.0.5.1.js`
- `phase1-sharepoint-schema-1.0.5.1.json`

`index.html` wird aktualisiert und lädt den neuen Patch nach 1.0.4 und 1.0.5.

## Danach zwingend einmal ausführen

In MOBIMORY:

**Einstellungen → Microsoft 365 Setup → Phase-1-Struktur prüfen / anlegen**

Das Setup ist additiv. Vorhandene Listen und Daten bleiben bestehen. Ergänzt werden insbesondere:

- `Wartungsplaene.Testdaten`
- neue Liste `Ereignisarten`
- `Ereignisse.EreignisartId`

Danach unter **Konfiguration → Ereignisarten** bei Bedarf **„Bisherige Standardauswahl übernehmen“** auswählen.
