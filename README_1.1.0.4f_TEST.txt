MOBIMORY 1.1.0.4f-dev – VISUELLES FÜHRERSCHEIN-TEMPLATE

Ziel dieses Builds
Nicht mehr den kompletten deutschen Kartenführerschein als freien Text lesen.
MobiMory kennt vorher Dokumentform, Vorder-/Rückseite und feste Lesebereiche.

Testumfang absichtlich klein:
- Feld 1: Nachname
- Feld 2: Vorname
- Feld 3: Geburtsdatum
Noch NICHT Bestandteil dieses Tests:
- Dokumentnummer
- Ablaufdatum
- Führerscheinklassen
- Rückseiten-Tabelle

Neu
- Für "Deutscher EU-Kartenführerschein" erscheint pro Seite "Geführt aufnehmen".
- Kamera zeigt einen festen Kartenrahmen im ID-1-Seitenverhältnis.
- Karte möglichst exakt mit allen Außenkanten in diesen Rahmen legen.
- Die Aufnahme wird direkt auf ein normiertes Kartenrechteck 1280 x 807 gebracht.
- Vorder- und Rückseite sind Pflicht.
- Danach werden auf der Vorderseite nur drei feste Zonen gelesen.
- Unter dem Ergebnis zeigt "Template-Diagnose" genau die drei Bildausschnitte, die OCR tatsächlich gelesen hat.
  Damit können wir beim Test sofort erkennen, ob die Feldkoordinaten noch verschoben werden müssen.
- Dateiimport bleibt möglich; Bilddateien werden auf das Karten-Seitenverhältnis normalisiert.

Wichtig
Dieser erste Build nutzt den vorgegebenen Rahmen zur geometrischen Normalisierung.
Eine automatische Erkennung/Entzerrung schräger vier Kartenecken ist noch NICHT eingebaut.
Darum die Karte beim Test möglichst sauber an den Rahmen legen.

TEST
1. Personen -> Person aus Dokument.
2. Deutscher EU-Kartenführerschein wählen.
3. Vorderseite -> "Geführt aufnehmen".
4. Führerschein vollständig in den weißen Rahmen legen -> aufnehmen.
5. Rückseite genauso.
6. "Dokument auslesen".
7. Ergebnis und darunter die drei Template-Diagnose-Ausschnitte prüfen.
8. Entscheidend ist zunächst:
   - liegt im Ausschnitt "1 · Nachname" wirklich nur der Nachname-Bereich?
   - "2 · Vorname" wirklich Vorname?
   - "3 · Geburtsdatum/-ort" wirklich Feld 3?

Kein Microsoft-365-Setup erforderlich.
