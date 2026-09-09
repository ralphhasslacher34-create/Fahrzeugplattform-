# MOBIMORY 1.0.6.1-dev

Dieser Build erweitert bewusst nur den Reisecheck. Das Dashboard / Rollenmodell ist **nicht** Bestandteil dieses Schritts.

## Inhalt

### 1. Zwei gleichberechtigte Reisecheck-Wege

- **Freier Reisecheck**: wie in 1.0.6 – Fahrzeug, Personen, Tiere, Zeitraum und Gebiete/Reviere direkt auswählen.
- **Geplante Nutzung prüfen**: vorhandene Nutzung auswählen. MOBIMORY übernimmt Fahrzeug, Zeitraum, Start, Zwischenziele, Ziel sowie die zugeordneten Personen und Tiere.

Beim geplanten Check können zusätzlich Routenvorgaben gesetzt werden:

- Autobahnen vermeiden
- Maut vermeiden
- Fähren vermeiden
- bestimmte Länder vermeiden
- freie zusätzliche Routenvorgabe

Die Online-Recherche liefert dazu eine **Routen- und Grenzanalyse** mit plausiblen Transitländern und Grenzübergängen. Grenzen werden nach aktuellem Rechercheergebnis als Schengen-Binnengrenze, Schengen-Außengrenze, Außengrenze außerhalb Schengen, Sonderfall oder Unklar ausgewiesen.

Wichtig: 1.0.6.1 ist noch keine Turn-by-Turn-Navigation. Wenn die konkrete Routenführung nicht belastbar ermittelt werden kann, muss der Research Service dies als `Prüfen` / Annahme sichtbar machen.

### 2. Automatik und manuelle Bewertung getrennt

Ein automatischer Status wird nicht mehr überschrieben.

Gespeichert werden getrennt:

- automatisches Ergebnis
- manuelle Bewertung
- manuelle Begründung
- Zeitpunkt der manuellen Bewertung
- Benutzerkennung (aktuell `current`, später Rollen-/Benutzerintegration)

Eine abweichende manuelle Bewertung verlangt eine Begründung. Die manuelle Bewertung kann später wieder entfernt werden; dann gilt wieder das unveränderte automatische Ergebnis.

## Installation GitHub

Aus diesem Update-Paket in das bestehende Repository übernehmen:

- `index.html` (bestehende Datei ersetzen)
- `index-1.0.6.1.html` (optional als Versionskopie)
- `patch-1.0.6.1.js`
- `phase1-sharepoint-schema-1.0.6.1.json`

Die bisherigen Dateien einschließlich `patch-1.0.6.js` und `phase1-sharepoint-schema-1.0.6.json` bleiben bestehen.

## Research Service aktualisieren

Der Worker muss ebenfalls auf 1.0.6.1 aktualisiert werden, weil die strukturierte Antwort jetzt zusätzlich Route/Länder/Grenzen enthält.

Auf Android am einfachsten den kompletten Inhalt von

`mobimory-research-worker-1.0.6.1-ASCII.txt`

in den Cloudflare Worker kopieren und den bisherigen Worker-Code vollständig ersetzen. Danach **Deploy**.

Die vorhandenen Cloudflare Variablen/Secrets bleiben unverändert:

- `OPENAI_API_KEY`
- `MOBIMORY_TOKEN`
- `OPENAI_MODEL`
- `ALLOWED_ORIGINS`

`/health` liefert nach dem Update zusätzlich `"serviceVersion":"1.0.6.1"`.

## Microsoft 365 Setup

Nach dem GitHub-Update einmal in MOBIMORY:

**Einstellungen → Microsoft 365 Setup → Phase-1-Struktur prüfen / anlegen**

Das Schema ist additiv und ergänzt nur die neuen Reisecheckfelder. Bestehende Daten werden nicht gelöscht.

## Test

Siehe `TESTPLAN_1.0.6.1.md`.
