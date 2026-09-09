# MOBIMORY 1.0.6 – Online Research Service

Der Research Service ist kein Zwischenprodukt, sondern der sichere Backend-Teil des Reisechecks. GitHub Pages kann einen privaten API-Schlüssel technisch nicht sicher speichern. Deshalb liegt die Web-/KI-Recherche in einem kleinen Cloudflare Worker; die Fahrzeugdaten bleiben weiterhin in SharePoint.

## Einmalige Einrichtung

1. Cloudflare-Konto öffnen und einen Worker `mobimory-research` anlegen.
2. Inhalt aus `research-service/worker.js` als Worker-Code verwenden.
3. Variablen setzen:
   - `OPENAI_MODEL = gpt-5.6-terra`
   - `ALLOWED_ORIGINS = https://ralphhasslacher34-create.github.io`
4. Zwei **Secrets** setzen:
   - `OPENAI_API_KEY` = eigener OpenAI-API-Schlüssel
   - `MOBIMORY_TOKEN` = selbst gewähltes langes Zufallspasswort
5. Worker deployen und die `https://…workers.dev`-Adresse kopieren.
6. In MOBIMORY: **Einstellungen → Online-Recherche**.
   - Worker-URL eintragen
   - denselben `MOBIMORY_TOKEN` eintragen
   - **Speichern & Verbindung testen**
7. In MOBIMORY einmal **Microsoft 365 Setup → Phase-1-Struktur prüfen / anlegen** ausführen.

Danach läuft der Reisecheck direkt:

**Reise auswählen → Aktuell online recherchieren & prüfen → Quellen + Soll/Ist-Ergebnis → speichern.**

## Datenschutz im Build

An den Research Service werden absichtlich nicht übertragen:
- Personennamen
- E-Mail / Telefon
- Kennzeichen
- FIN/VIN
- HIN/CIN
- Führerschein-/Dokumentnummern
- Chipnummern

Übertragen werden nur für die Prüfung notwendige abstrahierte Angaben, z. B. `P1` mit `BE gültig bis …`, `A1` mit `Tollwutimpfung gültig bis …`, Fahrzeugtyp, Maße/Gewichte, Ausrüstung und gewählte Reiseziele.

## API-Kosten

Der Worker verwendet standardmäßig `gpt-5.6-terra` mit OpenAI-Websuche. Modell und Nutzung sind API-kostenpflichtig. Das Modell kann über `OPENAI_MODEL` später gewechselt werden.
