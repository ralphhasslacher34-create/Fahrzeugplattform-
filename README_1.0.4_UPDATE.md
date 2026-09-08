# Fahrzeugplattform 1.0.4-dev – Update

Dieses Paket ist additiv zum aktuellen 1.0.3-dev-Stand.

## Dateien
- `index.html` ersetzt die vorhandene `index.html`.
- `patch-1.0.4.js` kommt zusätzlich ins Repository.
- `phase1-sharepoint-schema-1.0.4.json` kommt zusätzlich ins Repository.

## Danach
1. GitHub Pages Deployment abwarten.
2. App neu laden.
3. Einstellungen / Microsoft 365 Setup öffnen.
4. `Phase-1-Struktur prüfen / anlegen` einmal ausführen.
5. Erwartet werden danach 49 SharePoint-Listen; die neue Liste ist `Wetterdaten`.

## Enthalten
- Cockpit: Ablegen/Abfahrt und Anlegen/Ankunft als sichtbares Paar; Unterwegs-Zustand und Fahrzeit.
- Jeder Cockpit-Tipp erfasst Zeitpunkt und GPS-Kontext; GPS-Punkt entfällt aus dem Cockpit, Wegpunkt ist Ereignisart.
- Ereignis: kompakter Zeitpunkt, GPS vorausgefüllt, Vorschlag aus bekannten Orten/Standorten.
- Wetter-/Umweltmodul mit bootspezifischen Zusatzwerten.
- Tagesabschluss: Ort aus Ankunft, Highlights + Tagebuch, Nutzung fortsetzen oder beenden bei jeder Nutzungsart.
- Werkstatt: Statusaktionen für Aufgaben, Störungen, Arbeiten und Prüfungen.
- Verleih: deutsche Datumsanzeige, Beginn/Ende beim Bearbeiten vorausgefüllt, sichtbare Bearbeiten/Löschen/Beenden/Archivieren-Aktionen, Archivansicht.
- Reisecheck: echte Auswertung vorhandener Gebietsanforderungen und Personen-/Tiernachweise.
- Export/Testdaten um Wetterdaten erweitert.
