# MOBIMORY 1.0.6.14-dev – Planung / Live-Fahrt sauber getrennt

Basis: 1.0.6.12-dev. **1.0.6.13 muss nicht installiert werden.** Die nach dem 1.0.6.12-Test besprochene Logik ist direkt in 1.0.6.14 konsolidiert.

## Planungsmodus
- Live-GPS wird für Route, Reststrecke, ETA und Wetter **nicht verwendet**.
- Beispiel: Tablet in Sersheim, Boot/GPX Luxemburg → Konz. Die Vorschau rechnet ab GPX-Start.
- Startzeit kann wie bisher frei simuliert werden (z. B. 07:00 oder 14:00).
- Grundlage: GPX + gewählte Startzeit + V Reise.

## Fahrtstart
- Nur Cockpit öffnen bedeutet **nicht**, dass die Fahrt läuft.
- Live-Modus beginnt bei Motorboot mit dem Ereignis **Ablegen**, bei Straßenfahrzeugen mit **Abfahrt**.
- Beim Start wird die aktuelle GPS-Position mit dem GPX-Start verglichen.
- Liegt das Gerät deutlich entfernt, erscheint eine Warnung. Der Nutzer kann abbrechen (Planung bleibt) oder bewusst trotzdem starten.

## Während der Fahrt
- Auf/nahe der GPX: Wetter + ETA folgen der verbleibenden GPX-Strecke.
- Außerhalb der GPX:
  - deutlicher Abweichungshinweis,
  - geplante GPX bleibt auf der Karte sichtbar,
  - Wetter startet an der echten GPS-Position,
  - zukünftige Wetterpunkte werden über einen **Wetter-/Prognosekorridor aktuelle Position → Ziel** berechnet,
  - der Korridor ist ausdrücklich **keine Navigation und keine Kursanweisung**.

## Installation
ZIP lokal entpacken und die enthaltenen Dateien in das bestehende GitHub-Repository hochladen. `index.html` ersetzen. Wichtig insbesondere:
- `patch-1.0.6.14.js`
- `index.html`
- `index-1.0.6.14.html`

Kein neues Microsoft-365-Setup / kein neues SharePoint-Schema erforderlich.

Nach Neuladen muss unten links `1.0.6.14-dev` stehen.
