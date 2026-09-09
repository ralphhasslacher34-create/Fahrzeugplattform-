# MOBIMORY 1.0.6.5-dev – Cockpit-Fix

Dieses Update ist bewusst eng begrenzt und baut auf **1.0.6.4-dev** auf.

## A – Ausfahrt

Das **Ausfahrt-Cockpit** wird exakt auf den in 1.0.6.4 intern gesicherten **1.0.6.3-Cockpitstand** zurückgesetzt. Es wird nicht neu nachgebaut und erhält in diesem Patch keine zusätzliche Tank- oder Wasserski-Logik.

## B – Wasserski

Das **Wasserski-Cockpit** bekommt den neuen Stand 1.0.6.5 mit dieser Reihenfolge:

1. Abfahrtskontrolle
2. Tankanzeige / Tanken
3. Motor Start / Motor Stop mit sichtbarer BH-Hochrechnung
4. Ablegen
5. Runs
6. Anlegen
7. Foto / Film, Wetter, Ereignis

### Logische Sperren

- **Ablegen** ist gesperrt, solange kein Antriebsmotor läuft.
- **Runs** sind nur freigegeben, wenn das Boot abgelegt ist **und** mindestens ein Antriebsmotor läuft.
- Auch die eigentliche Aktion **Run starten** prüft diese Bedingungen nochmals; ein direkter Aufruf über Historie/Detailansicht umgeht die Sperre nicht.
- **Anlegen** ist nur während eines abgelegten Fahrzustands aktiv.
- **Motor Start** startet die Motorlaufzeit und damit die theoretische BH-Hochrechnung.
- **Motor Stop** beendet die Laufzeit/BH-Hochrechnung und nutzt die bereits in 1.0.6.4 vorhandene Stop-Auswertung.

## Keine weiteren Änderungen

- Keine neue Tankarchitektur.
- Keine Änderung an Startmasken.
- Keine Änderung an Planung, Tagesabschluss, Besatzung, Historie oder anderen Nutzungsarten.
- Keine neuen SharePoint-Felder oder Listen.
- **Microsoft-365-Setup muss für 1.0.6.5 nicht erneut ausgeführt werden**, sofern 1.0.6.4 bereits eingerichtet ist.

## Installation

Im bestehenden Repository auf Basis 1.0.6.4:

1. `index.html` ersetzen.
2. `index-1.0.6.5.html` hinzufügen (Versionskopie, optional).
3. `patch-1.0.6.5.js` hinzufügen.
4. Alle älteren Patch-Dateien einschließlich `patch-1.0.6.4.js` erhalten.
