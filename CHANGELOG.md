# Fahrzeugplattform – Build-Historie

Diese Datei ist die verbindliche technische Änderungshistorie. Abgeschlossene Punkte bleiben ihrem Build zugeordnet und werden bei späteren Builds nicht wieder als offene Arbeit behandelt.

## 1.0.0-alpha – Phase-1-Gesamtstand

### Neu
- Erster zusammenhängender Phase-1-Teststand statt weiterer Mikro-Builds.
- Erweiterter Fahrzeugstamm mit HIN/CIN, FIN/VIN, Erstzulassung, Dokumentnummern, Maßen, Tiefgang/Durchfahrtshöhe, Gewichten, Achsen, Kraftstoff und Notizen.
- Länderbezogene Maut-/Toll-Klassen je Fahrzeug mit Gültigkeitszeitraum.
- Komponenten als echte technische Datensätze: Hersteller, Modell, Seriennummer, Baujahr, Einbaudatum, Einbauort und Beschreibung.
- Beliebig viele technische Komponentenmerkmale mit Wert und Einheit.
- Tageszähler werden aus den aktiven Fahrzeugkomponenten abgeleitet: Motorboot zeigt nur tatsächlich angelegte Motoren; keine feste Zwei-Motor-Annahme mehr.
- Kostenbearbeitung mit Historisierung: Betragserhöhung beendet den alten Satz und legt ab Stichtag einen neuen an.
- Tierstamm vorbereitet/bedienbar.
- Cockpit speichert Ereignisse, Aufenthalte, Kontrollen, Versorgungsvorgänge, Messwerte und GPS-Punkte in SharePoint.
- Medienauswahl für Foto/Video mit lokalem Alpha-Cache und SharePoint-Metadatenbezug.
- Besatzungsänderung während einer Nutzung.
- Tagesabschluss schreibt Endmesswerte und beendet Tagesetappe/Nutzung.
- SharePoint-basierte Nutzungshistorie.
- Werkstatt-Grundworkflow für Störungen, Aufgaben, Wartungspläne, Prüfungen und Arbeiten.
- Verleihmodus mit Fahrzeug, Leiher, Zeitraum, Rechten, Übergabenotiz und Qualifikationsprüfung.
- Testdatenkennzeichen für Vorgangsdaten und Sammellöschung der markierten Testdaten.
- Vollständiger JSON-Datenexport über alle Phase-1-Listen.

### Geändert
- SharePoint-Schema auf 43 Listen / 356 Fachfelder erweitert.
- Fahrzeugkonfiguration stärker in fachliche Abschnitte gegliedert.
- Phase 1 wird ab diesem Stand als Gesamtsystem getestet; Folgeversionen dienen der Fehlerkorrektur, Bedienverbesserung und Ergänzung erkannter Lücken.

### Bekannte Alpha-Grenzen
- Foto/Video-Dateien werden in diesem Teststand noch nicht als Binärdateien in eine SharePoint-Dokumentbibliothek hochgeladen; SharePoint erhält Metadaten/Referenz, kleine Dateien können lokal im Browser gepuffert werden.
- Offline-Betrieb ist in diesem Alpha-Stand auf lokale aktuelle Nutzung/Medienpuffer und Browserdaten beschränkt; ein vollständiger konfliktfähiger Offline-Sync ist weiterhin eine nachgelagerte technische Ausbaustufe.
- Reisecheck ist eine Planungshilfe und keine rechtsverbindliche Auskunft.

## 0.8.0-dev – abgeschlossen
- `DocIcon`-Konflikt und allgemeine Feldzuordnung gehärtet.
- Aktiv/Inaktiv/Löschen, Kostenintervalle, Nutzungsarten-Stamm sowie Ort-/Standortmodell eingeführt.

## 0.7.0-dev – abgeschlossen
- Mehrtägige Nutzungsplanung, Personenauswahl, Nutzungsarten-Mapping und Lizenz-/Patent-Katalog.

## 0.6.0-dev – abgeschlossen
- Konfigurationsbereiche für Fahrzeuge, Personen, Gebiete und Reisecheck ausgebaut.

## 0.5.0-dev – abgeschlossen
- Erste echte SharePoint-Fahrzeugstammdaten.

## 0.4.x – abgeschlossen
- Microsoft OAuth/PKCE, Graph/SharePoint-Verbindung und additive Provisionierung stabilisiert.
