# Fahrzeugplattform 0.4.0-dev

Entwicklungsstand mit Microsoft-365-/SharePoint-Provisionierung.

Neu in 0.4.0:
- OAuth 2.0 Authorization Code + PKCE direkt aus der SPA
- kein Client-Secret im Browser
- Microsoft Graph v1.0 für SharePoint-Listen und Spalten
- Setup-Oberfläche unter Konfiguration → Microsoft 365 Setup
- Phase-1-Schema: 38 Listen / 225 Felder
- additive/idempotente Provisionierung

Hinweis: Für die Ziel-Site-Auflösung wird delegiert `Sites.Read.All` benötigt; für das Erstellen von Listen/Spalten `Sites.Manage.All`.
