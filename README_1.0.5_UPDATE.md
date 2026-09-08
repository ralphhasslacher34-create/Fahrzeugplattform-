# MOBIMORY / Fahrzeugplattform 1.0.5-dev – Update

Dieses Paket baut auf dem getesteten 1.0.4-dev-Stand auf. Der Reisecheck bleibt in dieser Version bewusst auf dem bisherigen 1.0.4-Stand; die automatische Online-/AI-Recherche ist für den darauffolgenden Ausbau vorgesehen.

## Dateien
- `index.html` ersetzt die vorhandene `index.html`.
- `patch-1.0.4.js` muss weiterhin im Repository bleiben.
- `phase1-sharepoint-schema-1.0.4.json` muss weiterhin im Repository bleiben.
- `patch-1.0.5.js` kommt neu ins Repository.
- `phase1-sharepoint-schema-1.0.5.json` kommt neu ins Repository.

## Danach
1. Dateien ins GitHub-Repository hochladen / `index.html` ersetzen.
2. GitHub Pages Deployment abwarten.
3. App vollständig neu laden.
4. Einstellungen → Microsoft 365 Setup öffnen.
5. `Phase-1-Struktur prüfen / anlegen` einmal ausführen.
6. Erwartet werden danach 54 SharePoint-Listen. 1.0.5 ergänzt fünf neue Listen; vorhandene Listen/Felder werden nur additiv erweitert.

## Neu in 1.0.5-dev

### Ort / Standort
- Ort und Standort können direkt im laufenden Vorgang angelegt werden.
- Aktuelle GPS-Position wird beim neuen Ort/Standort mit übernommen.
- Standort wird einem Ort zugeordnet.
- Orts-/Standortvorschläge lernen fahrzeugübergreifend aus früheren Vorgängen.
- Bestehende 1.0.4-Ereignisse und Aufenthalte werden beim Vorschlag mit ausgewertet.
- Gilt in dieser Version für Ereignis/Wegpunkt, Anlegen/Ankunft, Kontrolle, Ver-/Entsorgung und Wetter.

### Ver- / Entsorgung
- Cockpit-Bezeichnung `Ver- / Entsorgung`.
- Ein Vorgang kann mehrere Positionen enthalten.
- Je Position: Art, Aufnahme/Abgabe, Menge, Einheit, Komponente/Tank, optionale Kosten und Notiz.
- Beispiele: Kraftstoff, Frischwasser, Abwasser, Fäkalien, Strom/Laden, Gas, Müll.
- Kosten sind ausdrücklich auch bei Wasser/Abwasser usw. möglich.
- Kostenpositionen werden zusätzlich in `Ausgaben` gespiegelt, damit sie in Kosten-Auswertungen auftauchen können.

### Wetter
- Online-Abruf ist jetzt der Standard, wenn GPS vorhanden ist.
- Quelle: Open-Meteo; Quelle und Abrufzeit werden angezeigt und gespeichert.
- Aktuelle Werte werden automatisch geladen; vergangene Zeitpunkte werden soweit verfügbar über historische Wetterdaten abgefragt.
- Manuelle Eingabe bleibt als Korrektur/Ergänzung oder Offline-Fallback erhalten.
- Beim Motorboot wird zusätzlich versucht, aktuelle Wellenhöhe und Wassertemperatur über die Marine-API zu laden.

### Verleih
- Mitfahrende Tiere werden gespeichert und in Übersicht/Bearbeitung angezeigt.
- App-Rechte sind ausdrücklich von fachlichen Berechtigungen getrennt.
- Tierzuordnung wird relational in `UeberlassungsTiere` gespeichert; `TierIds` bleibt zusätzlich als Kompatibilitätsfeld erhalten.

### Fahrzeug-Berechtigungen
- Neue fahrzeugbezogene Berechtigungsregeln in der Fahrzeugkonfiguration.
- Straßenfahrzeuge: z. B. feste Fahrerlaubnisklasse.
- Boote: Regeln können als situativ hinterlegt werden, z. B. abhängig von Revier, Funk, Nutzung oder Ausrüstung.
- Der Verleih zeigt diese Regeln bereits an und kann feste hinterlegte Nachweise lokal gegenprüfen.
- Die vollständige revierabhängige Online-Prüfung kommt erst mit dem nächsten Reisecheck-Ausbau.

## Neue SharePoint-Listen
- `PositionsOrtsHistorie`
- `VerEntsorgungen`
- `VerEntsorgungsPositionen`
- `UeberlassungsTiere`
- `FahrzeugBerechtigungsRegeln`

## Hinweis
Open-Meteo-Daten sind Planungs-/Dokumentationsdaten. Marine Wettermodelle, insbesondere Wellen-/Meereshöhendaten in Küstennähe, ersetzen keine nautischen Navigations- oder Sicherheitsinformationen.
