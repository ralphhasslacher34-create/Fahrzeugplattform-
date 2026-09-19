MOBIMORY 1.1.0.4b-dev – GEFÜHRTE FAHRZEUG-DOKUMENTERKENNUNG

Basis
- aktueller GitHub-Stand 1.1.0.4a-dev
- keine SharePoint-Schemaänderung
- 1.1.0.4 und 1.1.0.4a bleiben unverändert

Neu
1. Fahrzeug aus Dokument anlegen:
   - zuerst Straßenfahrzeug oder Wasserfahrzeug wählen
   - danach werden nur die dazu passenden Dokumentarten angeboten
   - optional kann die exakte Dokumentart ausgewählt werden
   - bleibt die Auswahl auf "Automatisch", sucht MobiMory nur innerhalb dieser Fahrzeugwelt
2. Keine erzwungene Erkennung bei schwachem/uneindeutigem OCR-Treffer:
   - MobiMory fordert dann zur Auswahl der Dokumentart auf
3. Versionsanzeige auf 1.1.0.4b-dev angehoben.

TEST IBS
1. Konfiguration -> Fahrzeuge -> "Fahrzeug aus Dokument anlegen"
2. "Wasserfahrzeug" wählen.
3. Erwartung: nur IBS / WSA / CE / Schiffsregister-Unterlagen (gemäß aktueller Konfiguration).
4. Variante A: Dokumentart "Internationaler Bootsschein (IBS)" direkt auswählen.
5. IBS fotografieren und scannen.
6. Ergebnis muss als IBS behandelt werden, nicht als Kfz-Zulassungsbescheinigung.
7. Variante B: "Automatisch innerhalb dieser Fahrzeugwelt" wählen und nochmals testen.
   Bei unsicherer Erkennung darf kein Kfz-Dokument erscheinen; stattdessen soll MobiMory zur Dokumentauswahl auffordern.

INSTALLATION
- ZIP lokal entpacken.
- index.html im Repository ersetzen.
- patch-1.1.0.4b.js neu hochladen.
- GitHub Pages neu laden, nötigenfalls Browser-Cache aktualisieren.
- Kein erneutes Microsoft-365-Setup erforderlich.
