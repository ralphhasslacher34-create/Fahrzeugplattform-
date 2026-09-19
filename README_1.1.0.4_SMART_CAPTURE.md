# MobiMory 1.1.0.4-dev – Smart Capture Versuch

## Installation
1. Inhalt dieses Delta-Pakets in das bestehende Repository hochladen.
2. `index.html` überschreiben.
3. Die drei neuen Dateien zusätzlich hochladen:
   - `patch-1.1.0.4.js`
   - `phase1-sharepoint-schema-1.1.0.4.json`
   - `smart-capture-catalog-1.1.0.4.json`
4. App öffnen.
5. **Konfiguration → Microsoft 365 Setup** öffnen und die SharePoint-Struktur einmal prüfen/ergänzen lassen. Das Update ist additiv.

## Erster Test
### A. Dokumentbibliothek vorbereiten
1. **Konfiguration → Dokumente & Smart Capture** öffnen.
2. Länder und Fahrzeugwelten auswählen.
3. Speicherung persönlicher Zusatzdaten festlegen.
4. **Speichern und relevante Dokumente ermitteln**.
5. Gewünschte Dokumenttypen aktivieren und bei den jetzt benötigten Typen **Details jetzt vorbereiten** anhaken.
6. **Auswahl übernehmen / vorbereiten**.

### B. Fahrzeug aus Dokument
1. **Konfiguration → Fahrzeuge**.
2. **Fahrzeug aus Dokument anlegen**.
3. Zulassungsbescheinigung Teil I fotografieren/auswählen.
4. Erkennung kontrollieren und korrigieren.
5. Fahrzeug anlegen.

### C. Person aus Führerschein
1. **Konfiguration → Personen**.
2. **Person aus Dokument anlegen**.
3. Vorder- und Rückseite des Führerscheins fotografieren/auswählen.
4. Vorname, Nachname und Geburtsdatum kontrollieren.
5. Person anlegen.

### D. Späteren Befähigungsnachweis testen
1. Vorhandene Person öffnen.
2. **Nachweis aus Dokument hinzufügen**.
3. Zuerst aktuellen Führerschein/Referenznachweis scannen.
4. Identitätsvergleich bestätigen.
5. Erst danach Sportbootführerschein/Funkzeugnis scannen und übernehmen.

## In diesem Versuch bereits vorbereitet
- Deutscher EU-Kartenführerschein: Feldbedeutungen nach FeV Anlage 8.
- Deutsche Zulassungsbescheinigung Teil I: Feldbedeutungen nach FZV Anlage 6, einschließlich Feld 22.
- Deutsche Zulassungsbescheinigung Teil II: Feldbedeutungen nach FZV Anlage 8.
- Sportbootführerschein: Grundschema nach SpFV.
- UBI: Grundschema nach BinSchSprFunkV.
- SRC, LRC, IBS, WSA-Kleinfahrzeug-Zulassung, CE-Wasserfahrzeug und Schiffsregister sind im Katalog bereits vorgemerkt, aber noch nicht mit ungesicherten Feldregeln gefüllt.

## Datenschutz / Speicherung
- Vorname, Nachname und Geburtsdatum bilden den Identitätsanker.
- Weitere persönliche Daten werden nur entsprechend der Konfiguration gespeichert.
- OCR-Rohtext ist separat ein-/ausschaltbar.
- Eine Dokumentkopie ist separat ein-/ausschaltbar.
- Dokumentkopien werden in 1.1.0.4-dev nur lokal im Browser/IndexedDB des verwendeten Geräts gespeichert. Das ist ausdrücklich noch kein endgültiges Dokumentarchiv.

## Technische Hinweise
- Die OCR läuft im Browser mit Tesseract.js. Das OCR-Modul/Sprachmodell muss beim ersten Einsatz über das Internet geladen werden.
- Dieser Stand bereitet bekannte Dokumente über einen zentralen Katalog vor. Eine autonome Internetrecherche für neue Dokumenttypen benötigt später einen eigenen Recherche-/Backend-Dienst und ist noch nicht Bestandteil dieses Delta-Pakets.
- Unbekannte oder nur teilweise unterstützte Dokumente müssen im Prüfschritt kontrolliert werden.
