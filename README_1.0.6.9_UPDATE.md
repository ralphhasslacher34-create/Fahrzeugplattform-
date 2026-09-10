# MOBIMORY 1.0.6.9-dev — Block 1 Korrektur/Erweiterung

Dieser Build baut auf 1.0.6.8 auf und korrigiert die Routenstruktur nach der festgelegten Produktlogik.

## Grundprinzip

MOBIMORY bleibt Daten-, Logbuch- und Auswertesoftware. Es routet nicht und gibt keine Lenk-, Abbiege- oder Kurskorrekturanweisungen.

Die Navigations-/Routingsoftware des Users liefert bei Bedarf GPX. MOBIMORY übernimmt daraus weiterhin nur:

- GPS-Koordinaten
- Reihenfolge / Wegverlauf
- vorhandene Bezeichnungen

GPX-Zeitstempel und GPX-Geschwindigkeiten werden nicht als ETA-Grundlage verwendet.

## Neue Routenstruktur

Eine Nutzung/Reise kann jetzt zwei Ebenen enthalten:

1. **Gesamt-/Grobroute (optional)**
   - eine GPX für den groben Rahmen der gesamten Reise
   - bleibt an der Nutzung gespeichert
   - dient der Gesamtplanung und späteren Soll-/Ist-Auswertung
   - wird nicht als operative Wetterroute verwendet

2. **Beliebig viele Routenabschnitte**
   - jeder Abschnitt erhält seine eigene GPX
   - ein Abschnitt kann eine Stunde, einen Tag oder mehrere Tage umfassen
   - die Abschnitte lassen sich benennen, auswählen und sortieren
   - bei aktiver Nutzung kann ein Abschnitt als aktueller Abschnitt markiert werden
   - ETA, Routenwetter und Streckenabweichung arbeiten immer auf dem ausgewählten bzw. aktuellen Abschnitt

Die bisherigen 1.0.6.8-Felder `GPXRouteJson1068`, `GPXDateiname1068` und `GPXImportiertAm1068` bleiben bestehen und werden ab 1.0.6.9 als **Grobroute der gesamten Nutzung** interpretiert. Es findet keine destruktive Migration statt.

## Vorstart-Wetterfenster

Für jeden ausgewählten Routenabschnitt gibt es eine Vorstart-Wettervorschau.

- Startzeit frei einstellen
- Wetter für genau diese Startzeit neu berechnen
- mit `−1 h` / `+1 h` schnell andere Startfenster prüfen
- ausprobieren ist möglich, ohne die geplante Startzeit zu überschreiben
- gewünschte Startzeit kann anschließend ausdrücklich gespeichert werden

Vor dem tatsächlichen Start rechnet MOBIMORY weiterhin mit **V Reise manuell** aus den Fahrzeug-Stammdaten.

## Während der Nutzung

Die Logik aus 1.0.6.8 bleibt erhalten:

- GPS-Speedometer zeigt die reale GPS-Geschwindigkeit
- reale Fahrstrecke und Fahrzeit ohne Standzeiten werden ermittelt
- sobald genügend reale Daten vorhanden sind, wird der reale Fahrdurchschnitt der laufenden Nutzung zur ETA-Basis
- aktuelle GPS-Position wird auf den aktuellen GPX-Routenabschnitt projiziert
- Wetterpunkte werden nach der persönlichen User-Regel neu berechnet
- Ziel ist immer ETA- und Wetterpunkt
- bei zu großer Abweichung erscheint ausschließlich: `Bitte Route/Kurs überprüfen.`

## Wetterlogik pro User

Die bestehende persönliche Wetterlogik bleibt erhalten und kann jederzeit geändert werden, z. B.:

- alle 10 km
- alle 10 sm
- jede 1 Stunde an der voraussichtlichen Position

Eine Änderung berechnet die Wetterpunkte neu, ohne GPX-Daten zu verändern.

## M365-Schema 1.0.6.9

Neu ist die additive Liste `NutzungsRoutenabschnitte` mit:

- NutzungId
- Sortierung
- Abschnittsname1069
- GPXRouteJson1069
- GPXDateiname1069
- GPXImportiertAm1069
- GeplanterStart1069
- IstAktiv1069
- Aktiv
- Testdaten

Bestehende Listen und Daten werden nicht gelöscht oder umgebaut.

## Installation

1. ZIP lokal entpacken.
2. `patch-1.0.6.9.js` in das bestehende MOBIMORY-GitHub-Repository hochladen.
3. `phase1-sharepoint-schema-1.0.6.9.json` hochladen.
4. vorhandene `index.html` durch die beiliegende Version ersetzen.
5. GitHub Pages / App neu laden.
6. In MOBIMORY einmal **Einstellungen / Daten → Microsoft 365 Setup → Phase-1-Struktur prüfen / anlegen** ausführen.
7. Geplante Nutzung öffnen.
8. Optional Grobroute importieren.
9. Einen oder mehrere GPX-Routenabschnitte hinzufügen.
10. Abschnitt auswählen und Startzeit/Wetterfenster testen.

## Bewusst unverändert

- kein eigenes Routing
- keine Navigationsanweisungen
- kein Befehl zur Kurskorrektur
- Wasserski unverändert
- Motor-/BH-Logik unverändert
- Tanken/Versorgung unverändert
- bestehende Wettererfassung aus 1.0.6.7 bleibt erhalten
