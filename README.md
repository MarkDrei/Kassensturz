# Kassensturz

Interaktive Übersicht der Staatsfinanzen in Deutschland: Einnahmen und Ausgaben von Bund, Ländern,
Gemeinden und Sozialversicherung, nach Aufgabenbereichen und im Zeitverlauf.

Live: https://kassensturz.ironstrike.de

## Lokal starten
```
node server.js   # http://localhost:3000
```

## Deployment
Push auf `main` deployt automatisch (Docker-Image aus `Dockerfile`, Container hört auf Port 3000).
Andere Branches bekommen eine Preview unter `<branch>.kassensturz.ironstrike.de` (max. 3).
