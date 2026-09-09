# MOBIMORY 1.0.6.7-dev

Kleiner Praxis-Fix auf Basis 1.0.6.6. Keine SharePoint-Schemaänderung und kein neues Microsoft-365-Setup erforderlich.

## 1. Suchbare Personen und Orte

- Ortsfelder in Nutzung, Planung, Zwischenzielen und Ereignissen sind jetzt suchbar.
- Es werden höchstens wenige Treffer gleichzeitig angezeigt; kein Scrollen durch hunderte oder tausende Orte.
- Zuletzt auf diesem Gerät gewählte Orte werden bevorzugt angezeigt.
- Favoriten und vorhandene Verwendungswerte bleiben Teil der Sortierung.
- `+ neuen Ort anlegen` bleibt erhalten und verliert keine anderen Formulareingaben.
- GPS-/Programm-Auswahl eines gespeicherten Orts wird in das sichtbare Suchfeld übernommen.
- Primärperson sowie Crew-/Gästelisten sind suchbar.
- Bei Mehrfachauswahl bleiben bereits ausgewählte Personen sichtbar; zusätzlich werden maximal 8 passende Treffer eingeblendet.
- Zuletzt auf diesem Gerät gewählte Personen werden bevorzugt angezeigt.

## 2. Wohnmobil verschlankt

Beim Start eines Wohnmobils werden nur noch zwei Nutzungsarten angeboten:

- **Reise**: geplant, mehrtägig, Start/Ende und Start-/Zielort.
- **Spontanfahrt**: offen, Startdatum + Startort, ohne Ziel und ohne Enddatum.

Alte Nutzungsarten wie Tagesausflug/Kurztrip/Urlaub werden nicht gelöscht. Historische Verknüpfungen bleiben erhalten und werden beim neuen Start nur nicht mehr angeboten.

Falls `Reise` oder `Spontanfahrt` im SharePoint-Stamm noch nicht existieren, werden sie beim ersten Auswählen angelegt und dem aktuellen Wohnmobil zugeordnet.

Eine offene Spontanfahrt darf eine zukünftige Reiseplanung nur noch mit Vorbehaltswarnung überlappen. Der tatsächliche Start einer geplanten Reise bleibt gesperrt, solange die offene Nutzung nicht beendet wurde.

## 3. Wasser-Wetter

Für Motorboote zeigt die Wetteransicht oberhalb der bisherigen manuellen Wettererfassung eine kompakte Prognose.

Umschaltbare Zeitpunkte:

- Jetzt
- +1 h
- +2 h
- +3 h
- +6 h
- +12 h
- +24 h

Es wird immer nur **ein** Prognosezeitpunkt gleichzeitig angezeigt.

Angezeigt werden – soweit verfügbar:

- Temperatur
- Wind
- Böen
- Windrichtung
- Regenwahrscheinlichkeit
- Niederschlag
- Sicht
- Luftdruck
- Gewitterhinweis
- Wassertemperatur
- Wellenhöhe
- Wellenrichtung

Marinewerte werden nur gezeigt, wenn der Wetterdienst sie für den Standort liefert. Auf Binnenseen können Wellen-/Wassertemperaturdaten fehlen; die normale Wetterprognose bleibt trotzdem verfügbar.

Die Prognose wird **nicht** automatisch als tatsächlicher Wetter-Messwert gespeichert. Die bisherige manuelle Wettererfassung bleibt darunter unverändert.

### Wetterdienst / Lizenz

Der Entwicklungsstand nutzt Open-Meteo. Ohne hinterlegten kommerziellen API-Schlüssel wird der freie Endpoint für Entwicklung/Prototyping verwendet. Für eine kommerziell vertriebene MOBIMORY-Version muss vor Produktivstart ein zulässiger kommerzieller Zugang oder ein eigener kompatibler Wetterdienst konfiguriert werden. Attribution ist in der Wetteransicht eingebaut.

Optional kann später ein Open-Meteo-Kundenschlüssel über `localStorage` unter `fp_openmeteo_key` hinterlegt werden; dann verwendet der Patch die Customer-Endpunkte.

## Installation

1. ZIP lokal entpacken.
2. `patch-1.0.6.7.js` in das bestehende GitHub-Repository hochladen.
3. Vorhandene `index.html` durch die beiliegende Version ersetzen.
4. GitHub Pages/App neu laden, bei Bedarf Browser/PWA einmal komplett schließen und öffnen.
5. Kein Microsoft-365-Setup erforderlich.

## Nicht verändert

- Ausfahrt-Cockpit 1.0.6.3
- Wasserski-Cockpit 1.0.6.5
- Motor-/BH-Logik
- Tanklogik
- Törn-Planungsfix 1.0.6.6
- SharePoint-Schema
