MOBIMORY 1.0.6.9 FIX COMPLETE BLOCK 1

Ursache des 365-Problems:
1.0.6.9 benoetigt die Dateien aus 1.0.6.8. Das bisherige 1.0.6.9-ZIP war nur inkrementell und enthielt diese nicht. Wurde 1.0.6.8 zuvor nicht hochgeladen, startet 1.0.6.9 nur teilweise: die 365-Ueberschrift wird neu, der Inhalt bleibt aus der alten Ansicht.

Dieses FIX-Paket enthaelt deshalb gemeinsam:
- patch-1.0.6.8.js
- phase1-sharepoint-schema-1.0.6.8.json
- patch-1.0.6.9.js
- phase1-sharepoint-schema-1.0.6.9.json
- index.html / index-1.0.6.9.html mit Cache-Busting fuer 1.0.6.8 und 1.0.6.9

Vorgehen:
1. Inhalt dieses Ordners in das bestehende MOBIMORY-GitHub-Repository hochladen.
2. Vorhandene index.html ersetzen.
3. Die vier Patch-/Schema-Dateien mit hochladen.
4. GitHub Pages neu laden; notfalls Browserseite einmal komplett neu laden.
5. Einstellungen / Daten -> Microsoft 365 Setup oeffnen.
6. Dort muss die Microsoft-Anmeldung, Site-URL und der Button Phase-1-Struktur pruefen / anlegen sichtbar sein.
7. Setup einmal ausfuehren.

Voraussetzung: der bisherige Stand bis 1.0.6.7 bleibt im Repository vorhanden.
