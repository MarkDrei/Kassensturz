# Kassensturz

Interaktive Übersicht der Staatsfinanzen in Deutschland: Einnahmen und Ausgaben von Bund, Ländern,
Gemeinden und Sozialversicherung, nach Aufgabenbereichen und im Zeitverlauf.

Live: https://kassensturz.ironstrike.de

## Lokal starten
```
node server.js   # http://localhost:3000
```

## Aufbau
- `server.js` – kleiner Node-Server ohne Abhängigkeiten: liefert `public/` aus (gzip, im Speicher gecacht).
- `public/` – Frontend ohne Build-Schritt (ES-Module), Charts mit ECharts (`public/vendor/`).
  - `js/views/staat.js` – Gesamtstaat und Ebenen (Bund, Länder, Gemeinden, Sozialversicherung)
  - `js/views/bund.js` – Bundeshaushalt (Soll/Ist, Ministerien, Funktionen, Ausgabearten)
  - `js/views/sozial.js` – Sozialstaat (BMAS-Sozialbudget nach Lebenslage und System)
  - `js/views/schulden.js` – Schulden, Defizit, Zinsen, BIP
  - `js/views/vermoegen.js` – Privatvermögen, Verteilung, Erbschaften
  - `js/cofog.js` – Kurznamen und Erklärtexte der Aufgabenbereiche
  - `js/lib.js` – Formatierung, Einheiten (Mrd. €, real, % BIP, je Einwohner), Charts, Drilldown
- `public/data/*.json` – vorbereitete Daten, erzeugt von `scripts/`.

## Daten aktualisieren
```
python3 scripts/fetch_eurostat.py        # -> public/data/staat.json
python3 scripts/fetch_bundeshaushalt.py  # -> public/data/bund.json (dauert einige Minuten)
python3 scripts/fetch_sozialbudget.py    # -> public/data/sozial.json
python3 scripts/fetch_vermoegen.py       # -> public/data/vermoegen.json
```
Alle Quellen, Datensätze und Einschränkungen stehen in [SOURCES.md](SOURCES.md).

## Deployment
Push auf `main` deployt automatisch (Docker-Image aus `Dockerfile`, Container hört auf Port 3000).
Andere Branches bekommen eine Preview unter `<branch>.kassensturz.ironstrike.de` (max. 3).
