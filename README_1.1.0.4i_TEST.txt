MOBIMORY 1.1.0.4i-dev – GENERISCHE DOKUMENT-ENGINE

Dieser Build kombiniert die letzten beiden Architekturpunkte:

1. Kein Dokument-Sonderleser
   Dieselbe Engine gilt für Führerschein, Fahrzeugschein, IBS, Funkzeugnisse und angelernte Dokumente.

2. Feldtypen
   Textzeile, mehrzeiliger Text, Datum, Kennung/Nummer, Zahl/Maß, Liste/Klassen.
   Der Feldtyp beeinflusst OCR und Plausibilitätsprüfung.

3. Variable Texte
   Beim Anlernen bei Namen, Behörden usw. nicht nur den aktuellen kurzen Namen markieren,
   sondern den gesamten möglichen Textkorridor.

4. Präzisere Markierung
   - Gesamtbild zunächst vollständig sichtbar
   - Zoom bis 300 %
   - gelbe Eckpunkte zum Nachjustieren der aktuellen Auswahl

5. Hintergrundunterdrückung
   Pro Feld werden mehrere Bildvarianten probiert:
   - Kontrast/Graustufe
   - adaptive Hintergrundreduktion
   - bei schwachem Ergebnis zusätzlich Rot- und Blaukanal
   Gewählt wird anhand OCR-Vertrauen plus Passung zum Feldtyp.

6. Feldkennungen als Anker
   MobiMory verwendet die Feldkennungen aus der Dokumentbibliothek, z.B.:
   1, 4c, D.1, P.2.
   Ein Anker wird NUR verwendet, wenn er eindeutig erkannt wird.
   Mehrere Treffer oder kein sicherer Treffer => keine Schätzung => Geometrie-Fallback.

7. Anker beim Anlernen
   Jedes Feld kann mit einer vorhandenen Feldkennung verknüpft werden.
   Nicht sicher erkannte Anker können einmal mit Finger/Stift markiert werden.

8. Hybrid-Lesung
   Eindeutiger Anker vorhanden -> Lesebereich richtet sich daran aus.
   Sonst -> angelernte Geometrie.

9. Seitenrollen
   Für jede Seite jedes Dokuments:
   - Pflichtseite
   - optional
   - Detailseite / Zusatzdaten
   Keine fest verdrahtete Führerscheinregel.

10. Diagnose
    Nach OCR wird pro Feld angezeigt:
    - verwendeter Weg: Anker oder Geometrie
    - Feldtyp
    - gewählte Bildaufbereitung
    - OCR-Vertrauen

Kein Microsoft-365-Setup erforderlich.
Vorhandene DokumentSchemas1104 wird weiterverwendet.
