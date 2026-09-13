# MOBIMORY 1.0.6.15-dev – dynamische Begriffe

Basis: 1.0.6.14-dev. Reiner UI-/Sprachfix, **kein neues SharePoint-Schema**.

## Grundregel
Bis zur Auswahl der Nutzungsart bleibt **Nutzung** der neutrale Oberbegriff. Nach der Auswahl verwendet MOBIMORY in den folgenden Arbeitsansichten den konkreten Begriff, z. B.:

- Motorboot: **Ausfahrt / Törn / Wasserski**
- Wohnmobil: **Reise / Spontanfahrt**
- spätere Fahrzeugarten: vorhandene Nutzungsart wird automatisch als sichtbarer Begriff übernommen.

## Name als Hauptüberschrift
Sobald ein eigener Name vorhanden ist, wird er zur Hauptüberschrift.

Beispiel:
- **Sauerkraut 2027**
- darunter: `Törn · Karõshi`

Im Cockpit entsprechend:
- **Sauerkraut 2027**
- darunter: `Törn · Karõshi · Cockpit`

## Sichtbare Texte
Unter anderem werden nach der Auswahl dynamisch angepasst:
- `Name der Nutzung` → `Name des Törns` / `Name der Reise` / …
- `Nutzung starten` → `Törn starten` / `Reise starten` / …
- `Nutzung fortsetzen` → konkreter Begriff
- Detail-/Planungs-/Cockpit-Kopfzeilen
- nachgeladene Route-/Wetterbereiche, soweit dort der generische Begriff sichtbar war.

Intern bleiben Listen- und Feldnamen wie `Nutzungen`, `NutzungId` usw. unverändert. Es findet keine Datenmigration statt.

## Installation
ZIP lokal entpacken und die enthaltenen Dateien in das bestehende GitHub-Repository hochladen. `index.html` ersetzen. Wichtig insbesondere:
- `patch-1.0.6.15.js`
- `index.html`
- `index-1.0.6.15.html`

Kein Microsoft-365-Setup erforderlich.

Nach Neuladen muss unten `1.0.6.15-dev` stehen.
