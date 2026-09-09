# Testplan MOBIMORY 1.0.6.6

## 1. Törn – Startdatum
- Neue Nutzung → Motorboot → Törn.
- Erwartung: Es gibt nur die normalen Planungsfelder für Start/Ende; kein zusätzliches zweites Feld "Startdatum".

## 2. Offene Ausfahrt + zukünftigen Törn planen
- Eine Ausfahrt aktiv lassen, ohne Enddatum.
- Neue Nutzung → Törn → zukünftigen Zeitraum wählen.
- Erwartung: Verfügbarkeit zeigt Warnung "Planung unter Vorbehalt möglich", nicht harte Sperre.
- Planung speichern.
- Erwartung: Planung wird gespeichert; Hinweis, dass die offene Ausfahrt vor tatsächlichem Start beendet sein muss.

## 3. Tatsächlicher Start bleibt gesperrt
- Die Ausfahrt weiter aktiv lassen.
- Den geplanten Törn tatsächlich starten.
- Erwartung: Start wird durch die bestehende Verfügbarkeitsprüfung blockiert.
- Ausfahrt beenden und erneut starten.
- Erwartung: Start ist möglich, sofern kein anderer Konflikt besteht.

## 4. Echter Planungskonflikt
- Zwei zukünftige Törns mit sich überschneidendem Zeitraum anlegen.
- Erwartung: zweite Planung bleibt hart gesperrt.

## 5. Neuer Ort ohne Datenverlust
- Törn-Maske öffnen.
- Startdatum, Enddatum und einen Start-/Endort setzen.
- In einem Ortsfeld "+ neuen Ort anlegen" wählen.
- Neuen Ort eingeben.
- Erwartung: alle bereits eingegebenen Daten bleiben erhalten; nur das gewählte Ortsfeld wechselt auf den neuen Ort.

## 6. Regression Cockpit
- Ausfahrt öffnen: Cockpit weiterhin Stand 1.0.6.3.
- Wasserski öffnen: Cockpit weiterhin Stand 1.0.6.5.
