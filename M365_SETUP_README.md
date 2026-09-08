# Fahrzeugplattform – Microsoft 365 Setup 0.4.0

Diese Version kann sich aus GitHub Pages per OAuth 2.0 Authorization Code + PKCE mit Microsoft Entra anmelden und die Phase-1-SharePoint-Struktur via Microsoft Graph v1.0 provisionieren.

## Sicherheitsprinzip
- Kein Client-Secret und kein Zertifikat im Browsercode.
- Client-ID und Tenant-Domain sind öffentliche Identifikatoren.
- Zugriff erfolgt im Namen des angemeldeten Microsoft-365-Benutzers.
- Access Token bleibt nur in `sessionStorage` und wird nicht dauerhaft gespeichert.

## Entra-Konfiguration
App: `Fahrzeugplattform-Setup`
SPA Redirect URI:
`https://ralphhasslacher34-create.github.io/Fahrzeugplattform-/`

Delegierte Graph-Berechtigungen für den Setup-Lauf:
- `User.Read`
- `Sites.Manage.All`
- `Sites.Read.All` (für sichere Auflösung der Ziel-Site und Lesestatus)

Die bereits eingetragene Application-Berechtigung `Sites.ReadWrite.All` wird von der GitHub-Pages-SPA nicht verwendet, da dafür ein vertraulicher Client nötig wäre.

## Nutzung
1. Dateien ins GitHub-Repository `Fahrzeugplattform-` übernehmen.
2. GitHub Pages neu deployen lassen.
3. App → Konfiguration → Microsoft 365 Setup.
4. `Mit Microsoft 365 anmelden`.
5. Vollständige SharePoint-Site-URL eintragen.
6. `Phase-1-Struktur prüfen / anlegen`.

Das Setup ist additiv: vorhandene Listen und Felder werden erkannt, fehlende werden ergänzt.
