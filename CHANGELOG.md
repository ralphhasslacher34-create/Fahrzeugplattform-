# Fahrzeugplattform – Build-Historie

Diese Datei ist die verbindliche technische Änderungshistorie. Abgeschlossene Punkte bleiben ihrem Build zugeordnet und werden in späteren Builds nicht erneut als offene Aufgabe behandelt.

## 0.8.0-dev – aktueller Build

### Behoben
- SharePoint-Schreibfehler `DocIcon is read-only`: Komponenten verwenden das konfliktfreie Fachfeld `KomponentenTyp`.
- Graph-Schreibzugriffe filtern schreibgeschützte SharePoint-Systemfelder aus und bevorzugen exakte interne Fachfeldnamen.
- Teilaktualisierungen in langen Seiten halten den bearbeiteten Abschnitt stabiler; kein absichtlicher Rücksprung an den Seitenanfang.

### Neu / geändert
- Zentrale Aktionen für aktuelle Stammdaten: Aktiv/Inaktiv und Löschen in den neu ausgebauten Konfigurationsbereichen.
- Allgemeine Fahrzeugkosten mit Intervall: einmalig, monatlich, alle X Monate, jährlich, Start/Ende und nächste Fälligkeit.
- Nutzungsarten-Stamm als eigener Konfigurationsbereich; Fahrzeuge zeigen nur aktive, dem Profil zugehörige Nutzungsarten.
- Neuer zentraler Ortsstamm `Orte`.
- Neuer Standortstamm `Standorte`: Ort und konkreter Hafen/Stellplatz/POI sind getrennte Ebenen.
- Orte/Standorte können Favoriten sein, Nutzungen zählen und `Zuletzt verwendet` speichern.
- Nutzungsplanung verwendet Orts-/Standortauswahl statt wiederholtem Freitext.
- Mehrtägige Gesamtplanung und Tagesetappe speichern Ort-/Standort-IDs zusätzlich zum lesbaren Text.
- Zwischenziele werden aus dem Orts-/Standortstamm gewählt und geordnet gespeichert.
- Orts-/Standortmodell ist für spätere GPS-/Karten-/Navigationsfunktionen vorbereitet.
- SharePoint-Schema auf 42 Listen erweitert; neue Felder werden additiv ergänzt.

### Bewusst nicht erneut bearbeitet
- Personenauswahl in Nutzungen (Skipper/Fahrer, Crew/Beifahrer, Gäste) stammt aus 0.7.0 und bleibt bestehen.
- Lizenz-/Patent-Katalog stammt aus 0.7.0 und bleibt bestehen.

## 0.7.0-dev – abgeschlossen / Referenzstand
- Fahrzeugkonfiguration, Personen, Gebiete/Reviere, Reisecheck.
- Fahrzeugspezifische Nutzungsarten.
- Mehrtägige Nutzungen mit Gesamtplanung/Tagesetappe.
- Personen in Nutzungen aus Stammdaten.
- Vorbefüllter und erweiterbarer Lizenz-/Patent-Katalog.
- Bekannter Folgefehler `DocIcon is read-only`, in 0.8.0 behoben.

## 0.6.0-dev – abgeschlossen
- Konfigurationsbereich mit Fahrzeugausstattung, Merkmalen, Nutzungsarten, Prüfpunkten, Kosten, Personen, Gebieten und Reisecheck ausgebaut.

## 0.5.0-dev – abgeschlossen
- Fahrzeugstammdaten aus SharePoint lesen, anlegen und bearbeiten.

## 0.4.3-dev – abgeschlossen
- Microsoft OAuth/PKCE, Graph/SharePoint-Verbindung und additive M365-Provisionierung stabilisiert.

## Frühere Entwicklungsstände
- 0.4.0–0.4.2: Microsoft-Anmeldung und Redirect stabilisiert.
- 0.3.0: erstes M365-Provisionierungsmodul.
- 0.2.0: GitHub-Pages-Prototyp.
- 0.1.0: erster Entwicklungsprototyp.
