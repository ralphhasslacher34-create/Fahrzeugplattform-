# MOBIMORY 1.0.6.4-dev – Cockpit / Ausfahrt / Wasserski

## Enthalten

Dieses Update baut additiv auf **1.0.6.3-dev** auf.

### Motorboot allgemein
- Motoren starten nicht mehr automatisch beim Ablegen.
- Jeder Antriebsmotor hat im Cockpit einen eigenen Start-/Stop-Button.
- Motor Start und Motor Stop speichern Zeitpunkt und GPS-Kontext.
- Der beim Nutzungs-/Tagesstart bestätigte BH-Stand wird während der Nutzung aus den protokollierten Motorlaufzeiten hochgerechnet.
- Im Cockpit sind theoretischer BH-Stand und Laufzeit des Tages sichtbar.
- Beim Motorstopp werden Laufzeit und theoretischer BH-Stand angezeigt und als theoretischer Zwischenwert protokolliert.
- Beim Tagesabschluss wird der theoretische BH-Stand vorbelegt; der tatsächliche Stand muss bestätigt bzw. korrigiert werden.

### Tank
- Neue grafische Tankanzeige mit gefülltem/leeren Balken und Prozentwert.
- Ausgangsmodell zunächst manuell: Gesamtkapazität, aktueller Inhalt, Verbrauch Liter pro Motor-BH.
- Verbrauch wird aus der Summe der Motor-BH seit dem letzten Tank-Basisstand errechnet.
- Tanken erfasst Liter und Gesamtkosten; Preis pro Liter wird automatisch angezeigt.
- Ein Tankvorgang setzt die neue rechnerische Basis.
- Eine spätere automatische Verbrauchsableitung aus der Historie bleibt als nächster Entwicklungsschritt offen.

### Ausfahrt
- Kein geplantes Ziel erforderlich.
- Kein geplantes Enddatum erforderlich.
- Startdatum wird sichtbar geführt.
- Die Nutzung bleibt offen, bis sie bewusst beendet wird.
- Beim endgültigen Ende wird der letzte tatsächliche Aufenthaltsort als tatsächliches Endziel gespeichert.

### Wasserski
- Startmaske wird auf die betrieblich notwendigen Angaben reduziert: Startdatum, Skipper, Mit-an-Bord-Auswahl aus Crew/Gästen plus technische BH-Bestätigung.
- Eigenes Wasserski-Cockpit: Abfahrtskontrolle, Tank, Motoren, Ablegen/Anlegen, Runs, Foto/Film, Wetter, Ereignis.
- Kein Besatzungsbutton und kein Tagesabschluss im Wasserski-Cockpit.
- Runs speichern Läufer, Fahrer, Beobachter, Disziplin, Leinenlänge, Ski/Board, Geschwindigkeit und Drehzahl.
- Run-Start, Etappen-/Wechselpunkte und Run-Ende erhalten GPS-Zeitbezug; über den Run bleibt die Position dem Läufer zugeordnet.
- Dynamische Setups pro Läufer + Disziplin.
- Vor dem Start werden die Setupwerte sichtbar angezeigt.
- Nach dem Run können Werte geändert und anschließend nur für den Run belassen, ein bestehendes Setup überschrieben oder als zusätzliches Setup gespeichert werden.

## Installation

Auf dem Test-Branch werden ergänzt/geändert:

1. `patch-1.0.6.4.js` – neu
2. `phase1-sharepoint-schema-1.0.6.4.json` – neu
3. `index-1.0.6.4.html` – neue Versionskopie
4. `index.html` – lädt 1.0.6.4 als letzten Patch
5. `README_1.0.6.4_UPDATE.md` – diese Datei
6. `TESTPLAN_1.0.6.4.md` – Praxistest

Die älteren Patchdateien bleiben bestehen und werden weiterhin in Reihenfolge geladen.

## Microsoft 365 Setup

Nach Übernahme von 1.0.6.4 einmal ausführen:

**Einstellungen / Daten → Microsoft 365 Setup → Phase-1-Struktur prüfen / anlegen**

1.0.6.4 ergänzt additiv:
- `Nutzungen`: tatsächliches Endziel für Ausfahrten
- neue Liste `Tankmodelle1064`
- neue Liste `WasserskiSetups1064`
- zusätzliche Setup-/GPS-Felder in `WasserskiRuns`
- zusätzliche GPS-Felder in `WasserskiRunEtappen`

Vorhandene Daten werden nicht gelöscht.

## Hinweis zum Tankmodell

1.0.6.4 verwendet zunächst einen **manuell gesetzten Verbrauch pro Motor-Betriebsstunde**. Die spätere automatische Ermittlung/Glättung aus der Tank- und Motorhistorie ist bewusst noch nicht automatisch aktiv.
