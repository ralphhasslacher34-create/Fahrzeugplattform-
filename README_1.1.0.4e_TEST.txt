MOBIMORY 1.1.0.4e-dev – LERNENDER FELD-MAPPER

Nach dem Fahrzeugscan zeigt MobiMory:
Scan-Feldname | erkannter Inhalt | MobiMory-Zielfeld

- Feldname und Inhalt sind korrigierbar.
- Offensichtliche Zuordnungen werden vorgeschlagen.
- Übernehmen & merken speichert je Dokumenttyp.
- Speicherung lokal plus best-effort in DokumentSchemas1104.SchemaJson.
- Beim nächsten Scan desselben Dokumenttyps werden gelernte Zuordnungen automatisch vorgeschlagen und Werte übernommen.

TEST IBS
1. Wasserfahrzeug -> IBS -> Seite scannen/importieren.
2. Zuordnungen setzen, z.B. Hersteller, Jahr, Fahrzeugtyp, Länge, Breite, Verdrängung.
3. "Übernehmen & für dieses Dokument merken".
4. IBS erneut scannen.
5. Erwartung: bekannte Zuordnungen erscheinen als "gelernt" und Werte werden automatisch in die Maske übernommen.

Kein Microsoft-365-Setup erforderlich.
