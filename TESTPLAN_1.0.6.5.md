# Testplan MOBIMORY 1.0.6.5-dev

## 1. Ausfahrt – Rückkehr 1.0.6.3

- Ausfahrt öffnen.
- Prüfen, dass das Cockpit wieder dem 1.0.6.3-Stand entspricht.
- Insbesondere darf die spezielle 1.0.6.4-Wasserski-/Tank-Cockpitstruktur nicht in Ausfahrt erscheinen.

## 2. Wasserski – Motor aus / angelegt

- Wasserski-Nutzung starten.
- Motor ist aus.
- `Ablegen` muss gesperrt sein.
- `Runs` muss gesperrt sein.
- Hinweis auf Motorstart bzw. Ablegen muss sichtbar sein.

## 3. Wasserski – Motor Start / BH

- `Motor Start` drücken.
- Motorstatus muss auf läuft wechseln.
- BH-Anzeige muss sichtbar sein und während der Laufzeit theoretisch fortgeschrieben werden.
- `Ablegen` muss jetzt freigegeben sein.
- `Runs` bleibt vor Ablegen gesperrt.

## 4. Wasserski – Ablegen / Runs

- `Ablegen` drücken.
- Zeit/GPS werden wie bisher gespeichert.
- `Runs` muss jetzt freigegeben sein.
- Run-Seite öffnen; `Run starten` muss aktiv sein.

## 5. Run-Sperre doppelt prüfen

- Wieder anlegen oder Motor stoppen.
- Run-Seite erneut öffnen.
- `Run starten` muss deaktiviert sein.
- Falls die Funktion dennoch direkt ausgelöst wird, muss die Aktion mit Hinweis abgebrochen werden.

## 6. Anlegen / Motor Stop

- Während abgelegt: `Anlegen` muss aktiv sein.
- Nach Anlegen: `Runs` gesperrt, `Anlegen` gesperrt.
- `Motor Stop` drücken.
- Laufzeit und theoretischer BH-Stand werden über die bestehende 1.0.6.4-Logik ausgewertet.

## 7. Regression

- Andere Nutzungsarten öffnen.
- Sie dürfen durch 1.0.6.5 nicht verändert sein.
- Microsoft-365-Setup ist nicht erforderlich, da keine Schemaänderung enthalten ist.
