MOBIMORY 1.1.0.4h-dev – DOKUMENTTEMPLATE ANLERNEN

Grundsatz
- Keine geschätzten Feldkoordinaten mehr.
- Ein Dokument besitzt entweder ein verifiziertes visuelles Template oder ein einmal vom Nutzer angelerntes Template.
- Fehlt beides, sagt MobiMory das ausdrücklich.

Wichtiger gefundener Bug
- 1.1.0.4g versuchte die Zonen aus 1.1.0.4f über window.FP1104F zu ändern.
- FP1104F ist aber als globale const angelegt und damit nicht als window.FP1104F verfügbar.
- Die "korrigierten" Koordinaten konnten deshalb wirkungslos bleiben.
- 1.1.0.4h verwendet diese geschätzten Zonen überhaupt nicht mehr.

Anlernen
1. Dokumentart wählen.
2. Seite aufnehmen/importieren.
3. "Dokumentseite einmal anlernen".
4. Außenmaße:
   - beim deutschen EU-Kartenführerschein sind 85,60 × 53,98 mm vorbelegt.
   - bei Dokumenten ohne verifiziertes Maß (z.B. IBS in diesem Stand) muss der Nutzer reale Breite/Höhe messen/eingeben.
5. Außenkante des Dokuments auf dem Bild mit Finger/Stift als Rechteck markieren.
6. MobiMory fragt nacheinander die benötigten Felder.
7. Für jedes Feld den Datenbereich mit Finger/Stift als Rechteck markieren -> übernehmen.
8. Nicht vorhandene Felder können übersprungen werden.
9. Template speichern.

Speicherung
- Lokal als sofortiger Fallback.
- Zusätzlich im vorhandenen DokumentSchemas1104.SchemaJson.
- Kein neues SharePoint-Schema nötig.

Beim nächsten Dokument desselben Typs
- "Mit angelerntem Rahmen aufnehmen" steht zur Verfügung.
- Rahmen-Seitenverhältnis kommt aus den gespeicherten realen Außenmaßen.
- OCR liest nur die vom Nutzer angelernten Bereiche.
- Das Ergebnis zeigt zusätzlich die tatsächlich gelesenen Ausschnitte.

Führerschein
- Die geschätzten festen Zonen aus 1.1.0.4f/1.1.0.4g werden deaktiviert.
- Ohne angelerntes/verifiziertes Feldtemplate verweigert MobiMory die Feld-OCR und fordert zum einmaligen Anlernen auf.
- Das bekannte Außenmaß bleibt verwendbar.

IBS
- Kein Außenmaß wird erfunden.
- Beim ersten Anlernen reale Breite/Höhe eingeben.
- Danach kann MobiMory für weitere IBS derselben Variante einen passenden Rahmen anzeigen.

Kein Microsoft-365-Setup erforderlich.
