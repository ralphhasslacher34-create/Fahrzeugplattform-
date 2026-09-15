# MOBIMORY 1.1.0.0-dev – Stammdatenstruktur REBUILD

## Basis
Dieser Build wurde neu auf **1.0.6.15** aufgebaut. Die fehlerhaften Zwischenstände 1.1.0.1 und 1.1.0.2 werden **nicht geladen** und sind keine Basis dieses Builds.

## Grundprinzip
Es gibt nur noch **einen** Stammdaten-Editor für Fahrzeuge:
- Neues Fahrzeug → dieselbe Maske, leer.
- Bestehendes Fahrzeug → dieselbe Maske, mit Daten gefüllt.
- `vehicleconfigure` führt ebenfalls in genau diesen Editor und erzeugt keine zweite/alte Oberfläche.

## Fahrzeug
- 1.1 Identität
- 1.2 Zulassung / Registrierung
- 1.3 Abmessungen / Gewichte
- 1.4 Fahr- / Leistungsdaten
- 1.5 Rechtlich / administrativ
- 1.6 Feste Standorte

Der alte sichtbare Hauptbereich **Fahrzeugmerkmale / Eigenschaften** wird nicht verwendet. GPS-Intervall und Längeneinheit gehören nicht in diese Stammdatenmaske.

## Komponenten / Ausrüstung
Jede Komponente wird in einer einzigen Maske mit 2.1–2.7 bearbeitet:
- 2.1 Identität
- 2.2 Technische Merkmale (dynamisch)
- 2.3 Verbindungen / Zuordnungen
- 2.4 Lebenszyklus / Status
- 2.5 Wartung / Prüfung / Fristen
- 2.6 Kosten / Wert
- 2.7 Dokumente / Nachweise

Baugruppen/Unterkomponenten, Eigenbau und optionaler Kostenbezug sind vorbereitet.

## Datenhaltung
- Fahrzeugstruktur additiv in `Fahrzeuge.StammdatenJson1100`.
- Kernfelder wie Fahrzeugname, Profil, Hersteller, Modell und V-Reise werden parallel in den bestehenden Feldern gehalten, damit die bestehende App weiterarbeiten kann.
- Neue Komponenten werden in `Komponenten1100` gespeichert.
- Alte Listen/Daten werden nicht gelöscht.

## Installation
1. ZIP lokal entpacken.
2. `patch-1.1.0.0.js`, `phase1-sharepoint-schema-1.1.0.0.json` und `index.html` ins bestehende GitHub-Repository hochladen. Vorhandene gleichnamige Dateien ersetzen.
3. Die alten Dateien `patch-1.1.0.1.js` / `patch-1.1.0.2.js` dürfen im Repository liegen bleiben; der neue `index.html` lädt sie nicht.
4. GitHub Pages neu laden. Unten muss `1.1.0.0-dev` stehen.
5. Einmal **Microsoft 365 Setup → Phase-1-Struktur prüfen / anlegen** ausführen.

## Vor Übergabe geprüft
- JavaScript-Syntax (`node --check`).
- Schema ist gültiges JSON.
- Index lädt 1.0.6.15 und danach ausschließlich den neuen 1.1.0.0-Patch; 1.1.0.1/1.1.0.2 werden nicht geladen.
- Mock-Funktionstest für **Neues Fahrzeug**: 1.1–1.6 vorhanden, kein alter Fahrzeugmerkmale-Block.
- Mock-Funktionstest für **bestehendes Fahrzeug**: gleiche 1.1–1.6-Maske mit vorhandenen Daten.
- Mock-Funktionstest Komponentenliste und Komponenten-Editor: 2.1–2.7 vorhanden.

Hinweis: Die Tests prüfen Render- und Datenlogik mit einer simulierten SharePoint-API. Der echte Tenant-Zugriff wird wie bisher beim Test im Microsoft-365-Tenant geprüft.
