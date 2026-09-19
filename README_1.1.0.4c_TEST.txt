MOBIMORY 1.1.0.4c-dev – OCR-DIAGNOSE

Zweck
Dieser Patch ändert noch NICHT den IBS-Parser.
Er zeigt zuerst, was die OCR aus dem fotografierten Dokument tatsächlich lesen kann.

Neu
- Nach jedem Fahrzeugscan erscheint:
  "Was hat MobiMory tatsächlich gelesen?"
- Der Bereich ist aufklappbar.
- Angezeigt wird der komplette OCR-Rohtext.
- Der Diagnosebereich speichert den Text nicht zusätzlich.
- Die normale Einstellung "OCR-Rohtext dauerhaft speichern" bleibt davon getrennt.
- Footer/Versionsanzeige wird nach jedem Render auf 1.1.0.4c-dev gesetzt.

IBS-Test
1. Fahrzeug aus Dokument anlegen.
2. Wasserfahrzeug wählen.
3. Internationaler Bootsschein (IBS) auswählen.
4. Dasselbe IBS-Foto wie zuvor scannen.
5. Ergebnisfelder zunächst ignorieren.
6. Unten "Was hat MobiMory tatsächlich gelesen?" aufklappen.
7. Screenshot davon machen oder Text kopieren.

Danach können wir exakt unterscheiden:
A) OCR liest Hersteller, Bootsname, HIN, Maße usw. -> Parser/Mapping verbessern.
B) OCR liest diese Angaben nicht oder falsch -> zuerst Bilderkennung/OCR verbessern.

Installation
- Kein Microsoft-365-Setup nötig.
- index.html ersetzen.
- patch-1.1.0.4c.js neu ins Repository hochladen.
