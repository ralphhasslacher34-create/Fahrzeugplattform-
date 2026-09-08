# Fahrzeugplattform 0.4.3-dev

Entwicklungsstand mit Microsoft-365-/SharePoint-Provisionierung.

Neu in 0.4.3:
- OAuth 2.0 Authorization Code + PKCE direkt aus der SPA
- kein Client-Secret im Browser
- Microsoft Graph v1.0 für SharePoint-Listen und Spalten
- Setup-Oberfläche unter Konfiguration → Microsoft 365 Setup
- Phase-1-Schema: 40 Listen / 237 Felder
- additive/idempotente Provisionierung

Hinweis: Für die Ziel-Site-Auflösung wird delegiert `Sites.Read.All` benötigt; für das Erstellen von Listen/Spalten `Sites.Manage.All`.


## 0.8.0-dev
Konfiguration ausgebaut: Fahrzeugausstattung/Komponenten, Merkmale, fahrzeugspezifische Nutzungsarten, Prüfpunkte/Intervalle, allgemeine Fahrzeugkosten sowie echte SharePoint-Seiten für Personen, Funktionen, Befähigungen, Gebiete/Reviere, Anforderungen und Reisecheck.


## Update 0.8.0
Nach dem GitHub-Upload einmal unter **Einstellungen → Microsoft 365 Setup** die Struktur erneut prüfen/anlegen. Das Update ist additiv und ergänzt u. a. `Orte`, `Standorte`, Kostenintervalle und konfliktfreie Komponentenfelder.
