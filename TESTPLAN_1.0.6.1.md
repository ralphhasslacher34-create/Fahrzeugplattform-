# Testplan MOBIMORY 1.0.6.1-dev

Ziel: Nicht möglichst viele Funktionen testen, sondern genau die beiden Änderungen von 1.0.6.1 nachvollziehbar prüfen.

## Test A – Freier Reisecheck bleibt erhalten

1. Reisecheck öffnen.
2. `Freier Reisecheck` wählen.
3. Fahrzeug, Zeitraum, Personen/Tiere und mindestens ein vorhandenes Gebiet wählen.
4. Online recherchieren.

**Erwartung:** Der bisherige 1.0.6-Ablauf funktioniert weiterhin. Keine geplante Nutzung ist erforderlich.

## Test B – Geplante Nutzung wird übernommen

Vorher eine mehrtägige Nutzung mit Start, mindestens einem Zwischenziel und Ziel anlegen.

1. Reisecheck öffnen.
2. `Geplante Nutzung prüfen` wählen.
3. Nutzung auswählen.

**Erwartung:** Fahrzeug, Beginn/Ende, Personen, Tiere sowie Start → Zwischenziel(e) → Ziel werden übernommen und angezeigt.

## Test C – Länder und Grenzen

Eine geplante Straßenreise wählen, die mindestens eine Staatsgrenze überschreitet.

**Erwartung:** Nach der Online-Recherche erscheint oben `Routen- und Grenzanalyse` mit betroffenen Ländern und Grenzübertritten. Der Schengen-Status wird differenziert. Unsichere Sonderfälle dürfen nicht als sicher dargestellt werden.

Empfohlene zwei Vergleichstests:

- Route nur über Schengen-Staaten → Schengen-Binnengrenze(n)
- Route von einem Schengen-Staat in einen Nicht-Schengen-Staat → Schengen-Außengrenze muss sichtbar werden

## Test D – Routenoptionen

Dieselbe geplante Nutzung nacheinander prüfen:

1. ohne Einschränkungen
2. `Maut vermeiden`
3. `Autobahnen vermeiden`
4. optional `Fähren vermeiden` oder ein Land vermeiden

**Erwartung:** Die Vorgaben tauchen in Routenannahmen/-hinweisen auf und werden bei der Recherche berücksichtigt. Kann die konkrete Alternativroute nicht belastbar festgestellt werden, muss der Routingstatus `Prüfen` sein – keine erfundene sichere Route.

## Test E – Automatik darf nicht überschrieben werden

Einen Prüfpunkt mit automatischem Status `Fehlt` oder `Prüfen` auswählen.

1. Manuell auf `Erfüllt` setzen.
2. Abweichung begründen.
3. Reisecheck speichern.
4. Gespeicherten Reisecheck erneut öffnen.

**Erwartung:** Es stehen weiterhin getrennt sichtbar:

- Automatik: z. B. `Fehlt`
- Manuell: `Erfüllt`
- Wirksam: `Erfüllt`
- Begründung und Zeitpunkt der manuellen Bewertung

Die Automatik darf nicht zu `Erfüllt` umgeschrieben worden sein.

## Test F – Manuelle Bewertung zurücknehmen

Im gespeicherten Prüfpunkt die manuelle Bewertung auf `– keine manuelle Bewertung –` setzen und speichern.

**Erwartung:** Die manuelle Bewertung verschwindet und der wirksame Status fällt wieder auf den unveränderten Automatikstatus zurück.

## Abbruchkriterien

Wenn einer dieser Punkte nicht erfüllt ist, 1.0.6.1 nicht weiter ausbauen. Erst den konkreten Fehler korrigieren und denselben Test wiederholen.
