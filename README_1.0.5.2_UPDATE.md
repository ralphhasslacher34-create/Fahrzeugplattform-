# MOBIMORY 1.0.5.2-dev – Update

Dieses Paket ist ein **additives Update auf 1.0.5.1-dev**. Die bisherigen Dateien `app.js`, `patch-1.0.4.js`, `patch-1.0.5.js` und `patch-1.0.5.1.js` bleiben bestehen.

## Dateien

- `index.html` – aktualisierte Startdatei, lädt 1.0.5.2 als letzten Patch.
- `index-1.0.5.2.html` – identische Sicherungskopie der Startdatei.
- `patch-1.0.5.2.js` – Funktionsupdate.
- `phase1-sharepoint-schema-1.0.5.2.json` – additive SharePoint-Felder.

## Installation

1. Die vier Dateien aus diesem Paket in das GitHub-Repository hochladen.
2. Vorhandene `index.html` ersetzen.
3. `patch-1.0.5.2.js` und `phase1-sharepoint-schema-1.0.5.2.json` neu hinzufügen.
4. Die älteren Patch- und Schema-Dateien **nicht löschen**.
5. App neu laden.
6. **Einstellungen → Microsoft 365 Setup → Phase-1-Struktur prüfen / anlegen** einmal ausführen.

Das Setup ist additiv. Vorhandene Daten werden nicht gelöscht.

## Enthalten

### Zentrale Fahrzeug-Verfügbarkeit
Ein Fahrzeug kann in einem Zeitraum nur einmal belegt sein. Überlappungen zwischen Nutzung und Verleih sowie zwischen zwei Nutzungen oder zwei Überlassungen werden vor dem Speichern/Start blockiert.

### Verleih
- Rolle `Leiher/Gast` ist von `Fahrer/Skipper` getrennt.
- Ein Leiher kann gleichzeitig Fahrer oder Skipper sein.
- Beim Wohnmobil wird vor dem Speichern die am Fahrzeug hinterlegte Fahrerlaubnis geprüft.
- Klasse BE erfüllt eine Grundanforderung B.
- Anhängerregeln werden nur aktiv geprüft, wenn **Anhängerbetrieb geplant** markiert ist. Ohne Anhänger erscheinen sie nur als Hinweis.
- Fahrzeugbelegung wird gegen geplante/aktive Nutzungen und andere Überlassungen geprüft.

### Ereignisarten
`Bearbeiten` öffnet den Editor direkt unter der gewählten Ereignisart statt am Ende der gesamten Liste.

### Tiere
Jedes Tier besitzt eine dynamische Liste `Nachweise / Gesundheit / Reiseunterlagen`. Frei anlegbar sind z. B. Tollwutimpfung, Titer-Nachweis, Entwurmung, Gesundheitszeugnis oder Einfuhrunterlagen. Pro Nachweis stehen Status, Datumsfelder, Gültigkeit, Ergebnis, Nummer, Aussteller, Land/Region, Dokumentreferenz und Notiz zur Verfügung.

### Wartungen und Prüfungen
Unter **Konfiguration → Fahrzeuge → Ausrüstung / Technik**:
- Fahrzeugprüfungen als dynamische Liste: **Art der Prüfung | Intervall | Nächster Termin**. Die Liste darf leer sein.
- Jedes Bauteil besitzt die Bereiche **Wartungen** und **Prüfungen**.
- Wartungen können auch Austauschpflichten abbilden.
- Werkstatt ist jetzt Arbeits-/Fälligkeitsansicht; Wartungs- und Prüfregeln werden nicht mehr direkt dort neu angelegt.

### Wasserski
Runs werden als besondere Ereignisse der laufenden Wasserski-Nutzung behandelt. Start, Etappen, Rollenwechsel/Run-Ende und Rückfahrt werden direkt im Cockpit bedient. In der Nutzungsansicht erscheint die Run-Historie.

## Bewusst noch nicht enthalten

Der große automatische Online-/AI-**Reisecheck** bleibt für **1.0.6-dev** reserviert.

## Empfohlener Kurztest

1. Ereignisart → Bearbeiten: Editor erscheint direkt an der Zeile.
2. Tier → Nachweis anlegen und bearbeiten.
3. Fahrzeug → Fahrzeugprüfung anlegen; Bauteil → Wartung + Prüfung anlegen.
4. Wohnmobil mit Grundanforderung B: Fahrer mit BE muss grün sein.
5. Zusatzregel BE/Anhänger: ohne Anhänger nur Hinweis; mit Anhänger echte Prüfung.
6. Gleiche Fahrzeugüberlassung im selben Zeitraum ein zweites Mal versuchen: muss blockiert werden.
7. Nutzung während laufender/geplanter Überlassung starten: muss blockiert werden.
8. Überlassung mit Leiher ohne einen geeigneten Fahrer: muss blockiert werden.
9. Wasserski-Nutzung öffnen: Run-Bedienung muss direkt im Cockpit erscheinen.
