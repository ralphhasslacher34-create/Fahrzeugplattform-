# MOBIMORY 1.0.6-dev – Reisecheck mit echter Online-Recherche

## App-Update
Folgende Dateien über den bestehenden 1.0.5.3-dev Stand ins GitHub-Repository laden:
- `index.html`
- `index-1.0.6.html`
- `patch-1.0.6.js`
- `phase1-sharepoint-schema-1.0.6.json`

Danach in MOBIMORY einmal **Microsoft 365 Setup → Phase-1-Struktur prüfen / anlegen** ausführen.

## Research Service
Zusätzlich den Ordner `research-service` und die Datei `RESEARCH_SERVICE_SETUP.md` beachten. Ohne Research Service bleibt der Button bewusst gesperrt/mit Hinweis – es gibt keinen manuellen Schein-Zwischenschritt mehr.

## Funktion 1.0.6
- Fahrzeug, Zeitraum, Personen, Tiere, Länder/Gebiete/Reviere auswählen
- **Aktuell online recherchieren & prüfen**
- Research Service führt echte Websuche aus
- offizielle/behördliche Quellen werden bevorzugt
- Anforderungen werden als Pflicht / Wichtig / Empfohlen / Hinweis strukturiert
- Ergebnis wird mit anonymisierten vorhandenen Nachweisen abgeglichen: Erfüllt / Fehlt / Prüfen / Nicht relevant
- Quellenkonflikte und Unsicherheit werden sichtbar
- Reisecheck speichert Recherchezeitpunkt, Provider/Modell, Quellen- und Datenstand sowie einzelne Prüfpunkte in SharePoint
- einzelne Ergebnisse können später manuell korrigiert und begründet werden

## Sicherheitsprinzip
Der OpenAI-API-Schlüssel liegt niemals in GitHub oder im Browser. Die PWA kennt nur die Worker-URL und ein separates Zugriffstoken. Persönliche Identifikationsdaten werden für die Recherche nicht an den Provider gesendet.
