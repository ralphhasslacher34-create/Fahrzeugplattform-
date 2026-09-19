MOBIMORY 1.1.0.4a-dev – M365 SETUP 409 HOTFIX

Fehlerbild:
409 Conflict: A field with the specified name already exists

Ursache:
Bei einem wiederholten/additiven Microsoft-365-Setup kann ein SharePoint-Feld bereits vorhanden sein,
obwohl es in der lokal geladenen Feldliste nicht passend erkannt wurde. Das Setup brach dann fälschlich ab.

Änderung:
- 409 "field ... already exists" wird bei der Feldanlage als "bereits vorhanden" behandelt.
- Vorher wird die Spaltenliste erneut aus SharePoint geladen und mit normalisierten Namen abgeglichen.
- Keine vorhandenen Listen oder Felder werden gelöscht oder überschrieben.
- Smart Capture 1.1.0.4 bleibt unverändert.

INSTALLATION:
1. Inhalt dieses DELTA-Pakets in das GitHub-Repository hochladen/ersetzen.
2. GitHub Pages kurz aktualisieren lassen.
3. App neu laden (ggf. Browser-Refresh).
4. Konfiguration -> Microsoft 365 Setup.
5. SharePoint-Site-URL muss sein:
   https://ralphyourway.sharepoint.com/sites/Fahrzeugplattform
6. "Phase-1-Struktur prüfen / anlegen" erneut ausführen.
