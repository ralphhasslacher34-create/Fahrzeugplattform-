# MOBIMORY 1.0.5.3-dev – Korrekturpaket

Dieses Paket setzt auf dem vorhandenen Stand **1.0.5.2-dev** auf.

## Enthalten
- Personenfunktionen können aktiviert, inaktiv gesetzt oder – wenn historisch unbenutzt – gelöscht werden.
- Historisch verwendete Funktionen werden beim Entfernen automatisch nur inaktiv gesetzt.
- Komponenten haben getrennte dynamische Bereiche **Wartungen**, **Prüfungen** und **Austausch**.
- Austauschregeln werden im bestehenden Wartungsplan-Datenmodell über das neue Feld `RegelTyp` sauber von Wartungen getrennt.
- Wasserski-Run kann erst nach **Ablegen** gestartet werden.
- Solange ein Wasserski-Run aktiv ist, ist **Anlegen / Ankern** gesperrt.
- Ereignisse in der Nutzungsansicht zeigen **Uhrzeit · Datum**.
- Wasserski-Runs in der Nutzungsansicht zeigen ebenfalls **Uhrzeit · Datum**.

## Update
1. `patch-1.0.5.3.js` und `phase1-sharepoint-schema-1.0.5.3.json` ins GitHub-Repository hochladen.
2. Vorhandene `index.html` durch die Datei aus diesem Paket ersetzen.
3. GitHub Pages Deployment abwarten und die App neu laden.
4. In MOBIMORY **Microsoft 365 Setup → Phase-1-Struktur prüfen / anlegen** ausführen.
   Das Setup ist additiv. Es ergänzt nur `Wartungsplaene.RegelTyp`; vorhandene Daten bleiben bestehen.

## Kurzer Funktionstest
1. Person → Funktion hinzufügen → Inaktiv → Aktivieren.
2. Unbenutzte Funktion entfernen: Datensatz wird gelöscht.
3. Bereits in einer Nutzung verwendete Funktion entfernen: wird nur inaktiv gesetzt.
4. Fahrzeug → Ausrüstung / Technik → an einem Bauteil getrennt Wartung, Prüfung und Austausch anlegen.
5. Wasserski-Nutzung vor Ablegen: `Run starten` ist gesperrt.
6. Ablegen → Run starten → während aktivem Run darf Anlegen/Ankern nicht möglich sein.
7. Run beenden → Anlegen/Ankern wieder möglich.
8. Nutzung öffnen → Ereignisse zeigen z. B. `19:24 · 08.09.2026`.

Der große Reisecheck bleibt weiterhin für **1.0.6-dev** vorgesehen.
