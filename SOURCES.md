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
  | `gov_10a_exp` | Ausgaben nach Aufgabenbereichen (COFOG, Ebene I und II), zusätzlich je Bereich nach Art (`na_item` D1, P2, D62, D632, D7 …) | Ansicht „nach Aufgaben“ inkl. Drilldown bis zur Ausgabeart |
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

  - Die Aufteilung nach Art je COFOG-Bereich gibt es für die Ebene II nur für „Staat gesamt“ (ab 2012);
    die Teilsektoren melden nur Ebene I. Eine Ebene III gibt es in COFOG nicht.
  - Die Aufteilung der Sozialleistungen (D62/D632) nach auszahlender Ebene in „nach Art“ ist
    konsolidierungsfrei, weil die Leistungen an Haushalte fließen; die Summe der Ebenen entspricht exakt „Staat gesamt“.
  - Erläuterungstexte zu den COFOG-Bereichen (`public/js/cofog.js`) folgen der UN-COFOG-Klassifikation und dem
    Eurostat-COFOG-Handbuch (2019). „a.n.g.“ = anderweitig nicht genannt.

## `public/data/sozial.json` – Sozialbudget

- **Quelle:** Bundesministerium für Arbeit und Soziales (BMAS), „Sozialbudget <Jahr>“,
  CSV-Tabellen auf <https://www.bmas.de/DE/Service/Publikationen/Broschueren/a230-26-sozialbudget-2025.html>
  (Datenstand Mai 2026; ältere Ausgaben `a230-25…`, `a230-24…`, `a230-23…`).
- **Skript:** `scripts/fetch_sozialbudget.py` (liest die CSV-Links von den Veröffentlichungsseiten).
- **Tabellen:**
  | Tabelle | Inhalt | Verwendet für |
  |---|---|---|
  | II | Leistungen nach Institutionen (26 Systeme/Programme), 1992–2025 | „nach System“ |
  | I-2 | Leistungen nach Funktionen (Alter, Krankheit, Kinder …), 1992–2025 | „nach Lebenslage“, Ebene 1 |
  | III-2 | Funktionen × Institutionen, je Ausgabe zwei Jahre | „nach Lebenslage“, Ebene 2 (2021–2025) |
- **Hinweise:** 2024 vorläufig, 2025 geschätzt. Methode ESSPROS (identisch mit Eurostat `spr_exp_func`).
  Umfasst auch Arbeitgebersysteme (Entgeltfortzahlung, Betriebsrenten) und private Systeme (PKV, Riester),
  ist also breiter als der Staat. Die Gesamtsumme ist um Zahlungen zwischen den Systemen bereinigt;
  diese Bereinigung erscheint im Drilldown als negative Zeile „Verrechnungen“.
  Asylbewerberleistungen sind Teil von „Sozialhilfe und Eingliederungshilfe“ (Funktion „Allgemeine Lebenshilfen“),
  nicht separat ausgewiesen.

## `public/data/vermoegen.json` – Privatvermögen und Erbschaften

- **Skript:** `scripts/fetch_vermoegen.py`
- **Vermögensbilanz:** Deutsche Bundesbank / Destatis, „Sektorale und gesamtwirtschaftliche Vermögensbilanzen
  1999–2025“, Excel, Blatt „S 14 + S 15“ (private Haushalte inkl. Organisationen ohne Erwerbszweck), Mrd. € am Jahresende.
  <https://www.bundesbank.de/de/statistiken/gesamtwirtschaftliche-rechenwerke/vermoegensbilanzen/vermoegensbilanzen-773974>
- **Verteilung:** EZB, Distributional Wealth Accounts (experimentell), API `https://data-api.ecb.europa.eu/service/data/DWA/`,
  Serien `Q.DE.S14._Z._Z.NWA.{B50,T10,T5}.PT.S.N` (Anteile) und `Q.DE.S14.N.LE.NWA._Z.{EUR,EUR_MN,EUR_MD}.S.N`
  (Summe, Mittelwert, Median je Haushalt); Jahreswert = 4. Quartal, ab 2011. Nur S14, andere Bewertung –
  Summe weicht von der Bundesbank-Bilanz ab.
- **Erbschaften/Schenkungen:** Destatis, Erbschaft- und Schenkungsteuerstatistik (73611), Statistischer Bericht (xlsx),
  CSV-Blatt 73611-10: Gesamtwert der Erwerbe vor Abzug, tatsächlich festgesetzte Steuer, unbeschränkt
  steuerpflichtige Erwerbe, nach Festsetzungsjahr 2010–2025.
  <https://www.destatis.de/DE/Themen/Staat/Steuern/Weitere-Steuern/Publikationen/_publikationen-innen-steuer-erbschaft.html>
  Erfasst nur Fälle mit Steuerfestsetzung (die meisten Erbschaften liegen unter den Freibeträgen).
- **Einordnung (keine amtliche Zahl):** DIW Wochenbericht 27/2017 schätzt bis zu 400 Mrd. € Erbschaften und
  Schenkungen pro Jahr (2012–2027).

## Bundesländer einzeln (noch offen)

Destatis GENESIS (Tabellen 713xx, Jahresrechnungs-/Kassenstatistik) braucht für den Abruf ein
Konto mit API-Token; der Gast-Zugang darf nur suchen. Kandidaten: GENESIS mit Token,
regionalstatistik.de, Stabilitätsrat-Kennziffern.
