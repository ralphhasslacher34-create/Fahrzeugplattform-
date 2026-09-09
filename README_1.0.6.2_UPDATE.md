# MOBIMORY 1.0.6.2-dev

Dieses Update baut auf **1.0.6.1-dev** auf und erweitert Planung, Startablauf, Motorstatus und die Reisecheck-Routenbasis. Das SharePoint-Schema bleibt additiv; vorhandene Daten werden nicht gelöscht.

## Inhalt

### Reisecheck / Route
- Geplante Wegpunkte werden strukturiert mit Standort, Ort, Land, Adresse und – soweit vorhanden – GPS an den Research Service übergeben.
- Bei eindeutig nationalen Routen werden keine hypothetischen Grenz-/Schengen-Anforderungen erzeugt.
- Unsichere Transitländer oder Routen müssen als **Prüfen** sichtbar bleiben.

### Nutzungsplanung
- Jede Nutzung kann einen frei vergebenen Namen erhalten.
- Geplanter Start und geplantes Ende verwenden Datum **und Uhrzeit**.
- Ende muss mindestens eine Minute nach dem Start liegen.
- Geplante Nutzungen bleiben vor dem tatsächlichen Start bearbeitbar.
- Zählerstände werden nicht bei der Planung, sondern erst beim tatsächlichen Start bestätigt.

### Zählerstände
- Vor jedem tatsächlichen Start werden die aktuellen Zählerstände bestätigt bzw. korrigiert.
- Ein niedrigerer Wert als der zuletzt bekannte Stand verlangt einen Grund (z. B. Zählerwechsel, Reset, Korrektur).

### Motorlogik Motorboot
- Beim tatsächlichen Start werden alle als Antriebsmotor erkannten Motor-Komponenten als gestartet protokolliert.
- Der Cockpitstatus wird aus den gespeicherten Motorereignissen abgeleitet.
- Einzelne Motoren können als gestartet/gestoppt protokolliert werden.
- Beim Anlegen/Ankern werden laufende Antriebsmotoren als gestoppt protokolliert.
- Das Datenmodell bleibt für eine spätere automatische Motordatenerfassung offen.

## GitHub-Update

Den Inhalt dieses ZIPs in das bestehende Repository übernehmen. Dabei insbesondere ersetzen/ergänzen:

- `index.html` – ersetzen
- `index-1.0.6.2.html` – Versionskopie
- `patch-1.0.6.2.js` – neu
- `phase1-sharepoint-schema-1.0.6.2.json` – neu

`patch-1.0.6.1.js` und `phase1-sharepoint-schema-1.0.6.1.json` sind zur Vollständigkeit des Update-Pakets enthalten. Die älteren Patches bis einschließlich `patch-1.0.6.js` müssen im Repository bestehen bleiben, weil `index.html` sie weiterhin in Reihenfolge lädt.

## Microsoft 365 Setup

Nach dem GitHub-Update einmal in MOBIMORY ausführen:

**Einstellungen / Daten → Microsoft 365 Setup → Phase-1-Struktur prüfen / anlegen**

1.0.6.2 ergänzt additiv:
- `Nutzungen`: Nutzungsname / Planungs-Zeitstempel
- `Ereignisse`: Motor-/Aggregatbezug, Motoraktion, Quelle, GPS-Genauigkeit
- `Messwerte`: Notiz

## Research Service / Cloudflare

Der Worker liegt zusätzlich unter `research-service/` und als Android-freundliche ASCII-Kopie vor:

- `research-service/worker.js`
- `research-service/package.json`
- `research-service/wrangler.jsonc`
- `mobimory-research-worker-1.0.6.2-ASCII.txt`

Für einen manuellen Cloudflare-Update kann der komplette Inhalt der ASCII-Datei den bisherigen Worker-Code ersetzen.

Für eine GitHub-Anbindung des Workers kann in Cloudflare für den bestehenden Worker das Repository verbunden und `research-service` als Root-Verzeichnis verwendet werden. `keep_vars: true` verhindert, dass die im Dashboard gepflegten Variablen beim Deploy versehentlich entfernt werden.

Die bestehenden Secrets/Variablen bleiben im Cloudflare-Dashboard und gehören **nicht** ins Repository:
- Secret `OPENAI_API_KEY`
- Secret `MOBIMORY_TOKEN`
- Variable `OPENAI_MODEL`
- Variable `ALLOWED_ORIGINS`

Nach Worker-Update sollte `/health` zusätzlich `"serviceVersion":"1.0.6.2"` liefern.

## Prüfung

Siehe `TESTPLAN_1.0.6.2.md`.
