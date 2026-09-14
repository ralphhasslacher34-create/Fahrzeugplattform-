# Testplan MOBIMORY 1.1.0.2-dev

## Muss-Test – Renderpfad

1. Fahrzeug auswählen → `Fahrzeug konfigurieren` öffnen.
2. Direkt nach dem Kopf muss der neue Bereich **Stammdaten** beginnen.
3. Sichtbar: Tabs **Fahrzeug** und **Komponenten / Ausrüstung**.
4. Nicht sichtbar davor oder danach als Legacy-Doppelung:
   - `Weitere Fahrzeugmerkmale`
   - alte `Komponenten`-Maske
   - `Fahrzeugprüfungen`
   - alte Wartung / Prüfungen / Austausch
   - `Geschwindigkeit / ETA-Grundlage`
5. Tab Fahrzeug öffnen: 1.1–1.6 vorhanden.
6. Tab Komponenten / Ausrüstung öffnen: neue Komponentenliste bzw. 2.1–2.7-Editor vorhanden.
7. Ein Fahrzeugfeld speichern, Ansicht erneut öffnen: neuer Renderpfad bleibt erhalten.
8. Eine Komponente öffnen/speichern, Ansicht erneut öffnen: neuer Renderpfad bleibt erhalten.
9. Start / Planung / Cockpit öffnen: Regression – diese Ansichten müssen weiterhin erreichbar sein.

## Versionscheck

Footer und Seitentitel: `1.1.0.2-dev`.
