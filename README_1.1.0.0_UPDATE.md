# MOBIMORY 1.1.0.0-dev – Stammdaten neu

Basis: 1.0.6.15-dev. Block 1 (GPX / Route / Wetter / ETA) bleibt unverändert.

## Was geändert wurde

### Fahrzeug
Der bisherige sichtbare Hauptbereich „Eigenschaften“ wird in der Fahrzeugkonfiguration ausgeblendet. Die neue Struktur arbeitet mit:

1.1 Identität
1.2 Zulassung / Registrierung
1.3 Abmessungen / Gewichte
1.4 Fahr- und Leistungsdaten
1.5 Rechtliche / administrative Daten
1.6 Feste Standorte

Bekannte V-min/V-Reise/V-max-Werte aus 1.0.6.8 werden als Startwerte übernommen und weiterhin in den bestehenden Fahrzeugfeldern gespeichert. Bei Wasserfahrzeugen kann aus der Länge der Wasserlinie (LWL) die Rumpfgeschwindigkeit als berechneter Vergleichswert angezeigt werden.

### Komponenten / Ausrüstung
Eine Komponente wird in **einer zusammenhängenden Maske** bearbeitet:

2.1 Identität
2.2 Technische Merkmale (dynamisch: beliebig viele Merkmal/Wert/Einheit-Zeilen)
2.3 Verbindungen / Zuordnungen zwischen Komponenten
2.4 Lebenszyklus / Status
2.5 Wartung / Prüfung / Fristen
2.6 Kosten / Wert
2.7 Dokumente / Nachweise

Komponenten können Baugruppen/Unterkomponenten bilden. Beim Kostenbezug wird u. a. unterschieden zwischen „im Fahrzeug enthalten“, „separat angeschafft“, „Eigenbau“, „übernommen“ und „Preis unbekannt“.

## Datenhaltung

- Neue Fahrzeugstruktur: additive Felder an `Fahrzeuge` (`StammdatenJson1100`, Standdatum).
- Neue Komponentenstruktur: additive Liste `Komponenten1100`.
- Alte Eigenschaften/Komponenten werden **nicht gelöscht** und nicht automatisch migriert.
- Testdaten-Markierung ist in der neuen Komponentenliste vorgesehen, damit ein späterer kompletter Test-/Nutzerdatenreset sauber möglich bleibt. Ein destruktiver Reset-Button ist in 1.1.0.0 bewusst noch nicht aktiviert.

## Installation

1. ZIP lokal entpacken.
2. Den **entpackten Inhalt** ins bestehende MOBIMORY-GitHub-Repository hochladen.
3. `index.html` ersetzen.
4. GitHub Pages / App neu laden und unten auf `1.1.0.0-dev` achten.
5. Einmal **Einstellungen / Daten → Microsoft 365 Setup → Phase-1-Struktur prüfen / anlegen** ausführen. 1.1.0.0 benötigt die neuen Stammdatenfelder / Komponentenliste.

## Hinweis zu Dokumenten

1.1.0.0 führt die fachliche Dokument-Zuordnung/Metadaten an Fahrzeug und Komponenten. Die eigentliche Dateiablage bleibt zunächst im bestehenden Dokumentbereich; Binärdateien werden in diesem Build nicht in eine neue Bibliothek verschoben.
