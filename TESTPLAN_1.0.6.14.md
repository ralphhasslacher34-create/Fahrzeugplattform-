# Testplan MOBIMORY 1.0.6.14

## A – Planung zuhause
1. Törn/Route öffnen, GPX-Abschnitt Luxemburg → Konz auswählen.
2. Tablet darf weit entfernt sein (z. B. Sersheim).
3. Erwartung: keine Routenabweichungswarnung in der Planung.
4. Erwartung: volle GPX-Strecke wird gerechnet; bei Wetterregel 1 km entstehen viele Wetterpunkte + Ziel.
5. Startzeit 07:00 und 14:00 nacheinander berechnen; Wetter/ETA müssen neu berechnet werden.

## B – Cockpit vor Ablegen
1. Cockpit öffnen, noch nicht Ablegen drücken.
2. Erwartung: Route bleibt im Planungs-/Standmodus, kein Live-Fortschritt aus Tablet-GPS.

## C – Start weit vom GPX-Start entfernt
1. `Ablegen` drücken, während Tablet deutlich vom GPX-Start entfernt ist.
2. Erwartung: Warnung mit Distanz zum geplanten Start.
3. `Abbrechen`: kein Ablegen-Ereignis, kein Live-Modus.
4. Optional `OK`: bewusster Override erlaubt.

## D – reale Fahrt auf Route
1. Am Start bzw. nahe GPX-Start Ablegen.
2. Erwartung: Live-Modus, GPS-Speed, reale Fahrt, Reststrecke, ETA und Wetter entlang der verbleibenden GPX.

## E – reale Fahrt außerhalb Route
1. GPS außerhalb des eingestellten Abweichungsbereichs.
2. Erwartung: Hinweis `Bitte Route/Kurs überprüfen.`
3. Erwartung: geplante GPX bleibt sichtbar.
4. Erwartung: gestrichelter Wetter-/Prognosekorridor von echter GPS-Position zum Ziel.
5. Wetterpunkte liegen auf diesem Prognosekorridor; aktuelle GPS-Position erhält Wetter.
6. Keine Navigations- oder Kurskorrekturanweisung.
