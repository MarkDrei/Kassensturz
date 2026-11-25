# Datenquellen

Jede Datei in `public/data/` wird von einem Skript in `scripts/` erzeugt und enthält zusätzlich ein
`source`-Objekt (Quelle, Datensatz, Stand, Abrufdatum). Daten werden vorab geladen und committet,
nicht live pro Anfrage abgerufen.

## `public/data/staat.json` – Gesamtstaat und staatliche Ebenen

- **Quelle:** Eurostat, Staatsfinanzstatistik nach ESVG 2010 (die Zahlen meldet das Statistische
  Bundesamt / Destatis an Eurostat; sie entsprechen den Maastricht-Zahlen der VGR).
- **Skript:** `scripts/fetch_eurostat.py` (API: `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/`)
- **Datensätze:**
  | Datensatz | Inhalt | Verwendet für |
  |---|---|---|
  | `gov_10a_main` | Einnahmen und Ausgaben nach Art (ESVG-Transaktionen) | Einnahmen/Ausgaben, Saldo, Ansicht „nach Art“ |
  | `gov_10a_exp` | Ausgaben nach Aufgabenbereichen (COFOG, Ebene I und II) | Ansicht „nach Aufgaben“ inkl. Drilldown |
  | `gov_10dd_edpt1` | Maastricht-Schuldenstand (konsolidiert), Defizit | Schuldenstand Staat gesamt, Schuldenarten |
  | `gov_10q_ggdebt` | Vierteljährlicher Schuldenstand nach Teilsektoren | Schulden von Bund/Ländern/Gemeinden/SV vor 2022 (Wert Q4 = Jahresende) |
  | `nama_10_gdp` | BIP in jeweiligen Preisen, reales Wachstum, BIP-Deflator | Quoten (% BIP), Inflationsbereinigung, BIP-Ansicht |
  | `nama_10_pe` | Bevölkerung (Inländerkonzept) | Werte je Einwohner |
- **Sektoren:** S13 Staat (konsolidiert), S1311 Bund (Zentralstaat inkl. Extrahaushalte/Sondervermögen),
  S1312 Länder, S1313 Gemeinden, S1314 Sozialversicherung.
- **Abdeckung:** 1995–2025 (COFOG-Funktionen bis 2024; Schulden der Teilsektoren ab 2000).
- **Hinweise:**
  - Werte der Teilsektoren sind *nicht* untereinander konsolidiert: Zahlungen des Bundes an die
    Rentenversicherung erscheinen beim Bund als Ausgabe und bei der Sozialversicherung als Einnahme.
    Die Summe der Ebenen ist daher größer als „Staat gesamt“.
  - „Inflationsbereinigt“ = Deflationierung mit dem BIP-Deflator (`PD20_EUR`), in Preisen des letzten Jahres.

## `public/data/bund.json` – Bundeshaushalt (Kernhaushalt)

- **Quelle:** Bundesministerium der Finanzen, <https://www.bundeshaushalt.de> – Daten-API der
  Visualisierung „Bundeshaushalt digital“ (`https://www.bundeshaushalt.de/internalapi/budgetData`).
- **Skript:** `scripts/fetch_bundeshaushalt.py`
- **Inhalt:** je Haushaltsjahr 2012–2027
  - Soll (Haushaltsplan inkl. Nachträgen; für noch nicht beschlossene Jahre der Entwurf) und Ist (Haushaltsrechnung, bis 2025)
  - Ausgaben nach Einzelplan → Kapitel (Ministerien), nach Hauptfunktion → Oberfunktion
    (Funktionenplan), nach Hauptgruppe → Obergruppe (Gruppierungsplan, ökonomische Art)
  - Einnahmen nach Hauptgruppe → Obergruppe
- **Hinweise:** Nur der Kernhaushalt des Bundes; Sondervermögen (z. B. Bundeswehr, Infrastruktur und
  Klimaneutralität) sind nur über Zuführungen enthalten. „Schuldenaufnahmen am Kreditmarkt“
  (Obergruppe 32) wird als neue Kredite ausgewiesen.

## Bundesländer einzeln (noch offen)

Destatis GENESIS (Tabellen 713xx, Jahresrechnungs-/Kassenstatistik) braucht für den Abruf ein
Konto mit API-Token; der Gast-Zugang darf nur suchen. Kandidaten: GENESIS mit Token,
regionalstatistik.de, Stabilitätsrat-Kennziffern.
