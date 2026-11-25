#!/usr/bin/env python3
"""Write public/data/fakten.json: hand-curated single facts with their sources.

There is no machine-readable source for these numbers; every value below was taken by hand from the
document given in `sources` (Bundestag-Drucksachen, ministries, courts of audit, Destatis). Values in
Mio. EUR. To add or update a fact, edit FACTS and run: python3 scripts/build_fakten.py
"""
import json
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "public" / "data" / "fakten.json"
UPDATED = "25.11.2026"

CATEGORIES = {
    "krise": "Krisen",
    "entlastung": "Entlastungen",
    "projekt": "Großprojekte",
    "steuer": "Steuern",
    "politik": "Staat & Politik",
}

WD_SV = {"name": "Wissenschaftliche Dienste des Bundestags, „Sondervermögen, krisenbedingte Hilfsprogramme …“, WD 4 - 3000 - 009/26", "url": "https://www.bundestag.de/resource/blob/1157946/WD-4-009-26.pdf", "date": "Februar 2026"}
BMF_STEUER = {"name": "Bundesfinanzministerium, Kassenmäßige Steuereinnahmen, Kalenderjahr 2025", "url": "https://www.bundesfinanzministerium.de/Content/DE/Standardartikel/Themen/Steuern/Steuerschaetzungen_und_Steuereinnahmen/2026-01-29-steuereinn-4-quartal-gesamt-2025.pdf?__blob=publicationFile&v=4", "date": "Stand 02.02.2026"}
BREG_SPRIT = {"name": "Bundesregierung, Fragen und Antworten: Entlastung bei den Spritpreisen", "url": "https://www.bundesregierung.de/breg-de/service/fragen-und-anworten/entlastung-spritpreise-2453192", "date": "18.11.2026"}

FACTS = [
    # ---------------------------------------------------------------- Krisen
    {
        "id": "ahrtal", "cat": "krise", "year": 2025,
        "title": "Flutkatastrophe 2021 (Ahrtal, NRW)",
        "value": 5840, "valueNote": "ausgezahlt bis Ende 2025 – von bis zu 30 Mrd. € im Fonds",
        "lead": "Nach der Flut im Juli 2021 mit 183 Toten richteten Bund und Länder den Fonds „Aufbauhilfe 2021“ mit bis zu 30 Mrd. € ein. Bis Ende 2025 sind daraus 5,8 Mrd. € geflossen – weniger als 20 % des Volumens.",
        "bars": [
            {"label": "Fondsvolumen Aufbauhilfe 2021", "v": 30000, "note": "Obergrenze"},
            {"label": "Erste Schadensmeldung RLP + NRW", "v": 30900, "note": "vorläufig, Sept. 2021", "tone": "muted"},
            {"label": "Von Versicherungen reguliert", "v": 8750, "note": "GDV, Stand 2026", "tone": "muted"},
            {"label": "Ausgezahlt bis 31.12.2025", "v": 5840},
        ],
        "points": [
            "Aufteilung: 2 Mrd. € für Bundesstraßen, Bahn u. a. zahlt der Bund allein; die bis zu 28 Mrd. € für die Länder tragen Bund und Länder je zur Hälfte. Ihren Anteil zahlen die Länder bis 2050 über die Umsatzsteuerverteilung zurück (rund 233 Mio. € pro Jahr).",
            "Mitte 2026 waren laut Finanzministerium rund 6,2 Mrd. € abgerufen, davon 2,6 Mrd. € in NRW und 2,5 Mrd. € in Rheinland-Pfalz (Pressebericht). Die Länder meldeten Anträge über rund 10 Mrd. €.",
            "Anträge waren bis 30.06.2026 möglich, Bewilligungen laufen bis 2030. Zusätzlich gab es bis zu 800 Mio. € Soforthilfe (Bund und Länder je zur Hälfte).",
        ],
        "sources": [
            {"name": "Bundesregierung, Zwischenbericht zur Flutkatastrophe 2021 (Schäden, Tote, Finanzierung)", "url": "https://www.bundesregierung.de/resource/blob/974430/1963706/613b934d3f359a5118df16755e9e527c/2021-09-27-zwischenbericht-hochwasser-data.pdf?download=1", "date": "27.09.2021"},
            WD_SV | {"note": "„Bis zum 31. Dezember 2025 sind aus dem Sondervermögen ‚Aufbauhilfe 2021‘ 5,8 Milliarden Euro abgeflossen.“"},
            {"name": "Deutscher Bundestag, hib 180/2026 zur Antwort der Bundesregierung (Drucksache 21/4443)", "url": "https://www.bundestag.de/presse/hib/kurzmeldungen-1154988", "date": "11.03.2026"},
            {"name": "Pressebericht (dts/Politico) mit Angaben des Finanzministeriums zum Stand 30.06.2026", "url": "https://foerde.news/news/erst-20-prozent-aus-flut-sonderverm%C3%B6gen-abgerufen-1783958770758.html", "note": "kein amtliches Dokument"},
            {"name": "Versicherte Schäden: GDV, berichtet von Autohaus", "url": "https://www.autohaus.de/nachrichten/schadenbusiness/fuenf-jahre-nach-der-ahrtalflut-versicherer-warnen-vor-truegerischer-sicherheit-3829307", "date": "17.08.2026", "note": "Pressebericht"},
        ],
    },
    {
        "id": "energiekrise", "cat": "krise", "year": 2023,
        "title": "Energiekrise 2022/23: der „Doppel-Wumms“",
        "value": 71700, "valueNote": "Kredite tatsächlich aufgenommen – Rahmen waren 200 Mrd. €",
        "lead": "Für Gas- und Strompreisbremse, Dezember-Soforthilfe und Uniper durfte der Bund über den Wirtschaftsstabilisierungsfonds bis zu 200 Mrd. € Schulden machen. Genutzt wurden 71,7 Mrd. €, bevor der Fonds Ende 2023 aufgelöst wurde.",
        "bars": [
            {"label": "Kreditrahmen Abwehrschirm", "v": 200000, "tone": "muted"},
            {"label": "Tatsächlich aufgenommen", "v": 71700},
            {"label": "Strompreisbremse", "v": 16300, "note": "ausgegeben"},
            {"label": "Gaspreisbremse", "v": 14300, "note": "ausgegeben"},
            {"label": "Uniper-Rettung (Eigenkapital)", "v": 13500},
            {"label": "Dezember-Soforthilfe Gas", "v": 8500, "note": "ausgegeben"},
        ],
        "points": [
            "Ausgaben für die einzelnen Hilfen laut Antwort des Finanzministeriums an einen Abgeordneten (Pressebericht, Sept. 2026): zusammen rund 50 Mrd. € in 27 Maßnahmen. Frühere Schätzungen des Wirtschaftsministeriums lagen teils darunter (Dezemberhilfe 4,8 Mrd. €).",
            "Uniper gehört seit Ende 2022 zu rund 99 % dem Bund; die 13,5 Mrd. € sind Eigenkapital, das teilweise zurückfließt, wenn der Bund seine Anteile verkauft.",
        ],
        "sources": [
            WD_SV | {"note": "„Bis zu diesem Stichtag sind Kredite in Höhe von 71,7 Milliarden Euro in Anspruch genommen worden“"},
            {"name": "Deutscher Bundestag, hib 671/2022: Wirtschaftsplan des WSF 2023", "url": "https://www.bundestag.de/presse/hib/kurzmeldungen-921804", "date": "21.11.2022"},
            {"name": "Ausgaben je Maßnahme: dpa-Bericht über eine Antwort des Finanzministeriums", "url": "https://www.ad-hoc-news.de/wirtschaft/die-bundesregierung-hat-zur-abfederung-der-energiekrise-nach-dem/70087416", "date": "11.09.2026", "note": "Pressebericht; die Antwort selbst ist nicht veröffentlicht"},
            {"name": "Bundesfinanzministerium, Einstieg des Bundes bei Uniper", "url": "https://www.bundesfinanzministerium.de/Content/DE/Pressemitteilungen/Finanzpolitik/2022/12/2022-12-22-einstieg-bund-bei-uniper-vollzogen.html", "date": "22.12.2022"},
        ],
    },
    {
        "id": "corona", "cat": "krise", "year": 2021,
        "title": "Corona-Wirtschaftshilfen",
        "value": 73900, "valueNote": "Zuschüsse an Unternehmen und Selbständige",
        "lead": "Überbrückungshilfen, November-/Dezemberhilfe, Soforthilfe und Neustarthilfe summieren sich auf rund 74 Mrd. €. Dazu kamen Kredite, Kurzarbeitergeld und Steuererleichterungen.",
        "bars": [
            {"label": "Überbrückungshilfe I–IV", "v": 46600},
            {"label": "November-/Dezemberhilfe 2020", "v": 13700},
            {"label": "Soforthilfe 2020 (nach Rückzahlungen)", "v": 10700},
            {"label": "Neustarthilfe für Soloselbständige", "v": 2800},
            {"label": "Zum Vergleich: Kurzarbeitergeld 3/2020–8/2022", "v": 45400, "tone": "muted"},
        ],
        "points": [
            "Neue Schulden des Bundes (Kernhaushalt): 130,5 Mrd. € (2020), 215,4 Mrd. € (2021), 115,4 Mrd. € (2022) – jeweils mit Ausnahme von der Schuldenbremse.",
            "KfW-Kredite: 57,4 Mrd. € zugesagt. Steuerliche Corona-Hilfen: 72,7 Mrd. € weniger Einnahmen für Bund, Länder und Gemeinden.",
        ],
        "sources": [
            WD_SV | {"note": "Tabelle 4 nach der Evaluation von ZEW/Prognos für das Wirtschaftsministerium (April 2025)"},
            {"name": "Bundesfinanzministerium, Monatsbericht 01/2023: vorläufiger Abschluss Bundeshaushalt 2022", "url": "https://www.bundesfinanzministerium.de/Monatsberichte/2023/01/Inhalte/Kapitel-3-Analysen/3-3-vorlaeufiger-abschluss-bundeshaushalt-2022.html"},
            {"name": "Bundesfinanzministerium, Monatsbericht 09/2024, Tabelle 6.1.08 (Nettokreditaufnahme)", "url": "https://www.bundesfinanzministerium.de/Monatsberichte/Ausgabe/2024/09/Inhalte/Kapitel-6-Statistiken/6-1-08-bundeshaushalt.html"},
        ],
    },
    {
        "id": "masken", "cat": "krise", "year": 2020,
        "title": "Schutzmasken 2020",
        "value": 5900, "valueNote": "für 5,7 Mrd. Masken",
        "lead": "Das Gesundheitsministerium kaufte 2020 rund 5,7 Mrd. Schutzmasken für 5,9 Mrd. €. Verteilt wurden bis Ende 2023 nur 1,7 Mrd. – die Hälfte des Bestands ist oder wird vernichtet.",
        "bars": [
            {"label": "Gekauft", "v": 5700, "text": "5,7 Mrd. Stück"},
            {"label": "In Deutschland verteilt", "v": 1700, "text": "1,7 Mrd. Stück"},
            {"label": "2023 vernichtet (abgelaufen)", "v": 1200, "text": "1,2 Mrd. Stück", "tone": "muted"},
            {"label": "Zur Vernichtung vorgesehen", "v": 1700, "text": "1,7 Mrd. Stück", "tone": "muted"},
        ],
        "points": [
            "Folgekosten für Lager, Logistik und Rechtsstreitigkeiten: 460 Mio. € bis Ende 2023, für 2024 bis zu 534 Mio. € erwartet.",
            "Lieferanten klagen in rund 100 Verfahren auf zusammen etwa 2,3 Mrd. € (Pressebericht).",
        ],
        "sources": [
            {"name": "Bundesrechnungshof, Bericht zur Maskenbeschaffung", "url": "https://bundesrechnungshof.de/SharedDocs/Kurzmeldungen/DE/2024/maskenbeschaffung.html", "date": "28.03.2024"},
        ],
    },
    # ---------------------------------------------------------------- Entlastungen
    {
        "id": "tankrabatt-2026", "cat": "entlastung", "year": 2026,
        "title": "Tankrabatte 2026",
        "value": 4095, "valueNote": "geschätzte Steuerausfälle beider Senkungen",
        "lead": "Wegen stark gestiegener Ölpreise nach dem Iran-Krieg senkte der Bundestag 2026 zweimal die Energiesteuer auf Benzin und Diesel um 14,04 Cent je Liter, mit Mehrwertsteuer rund 17 Cent: von Mai bis Juni und von Oktober bis Dezember.",
        "bars": [
            {"label": "1. Tankrabatt, Mai–Juni 2026", "v": 1610, "note": "Energiesteuer 1,45 Mrd. + Umsatzsteuer 0,17 Mrd."},
            {"label": "2. Tankrabatt, Okt.–Dez. 2026", "v": 2485, "note": "Energiesteuer"},
            {"label": "Zum Vergleich: Tankrabatt 2022", "v": 3150, "note": "Juni–Aug. 2022", "tone": "muted"},
        ],
        "points": [
            "Das sind Schätzungen aus den Gesetzentwürfen; wie viel tatsächlich weniger eingenommen wurde, ist noch nicht veröffentlicht.",
            "Den zweiten Rabatt beschloss der Bundestag als Änderungsantrag zu einem Gesetz über die Versicherungsaufsicht. Laut Bundesregierung tragen die Länder davon 1,25 Mrd. € über einen Festbetrag bei der Umsatzsteuer; in der Finanztabelle der Drucksache steht der Ausfall voll beim Bund.",
            "Die Koalition plant ab 1. Januar 2027 für drei Monate einen Spritpreisdeckel (noch kein Gesetz).",
        ],
        "sources": [
            {"name": "Entwurf 2. Energiesteuersenkungsgesetz, Drucksache 21/5321 (1. Tankrabatt)", "url": "https://dserver.bundestag.de/btd/21/053/2105321.pdf", "date": "14.04.2026", "note": "„Steuermindereinnahmen bei der Energiesteuer für den Bundeshaushalt in Höhe von 1,45 Mrd. Euro … Die Umsatzsteuermindereinnahmen betragen rund 165 Mio. Euro.“"},
            {"name": "Beschlussempfehlung Finanzausschuss, Drucksache 21/8157 (2. Tankrabatt)", "url": "https://dserver.bundestag.de/btd/21/081/2108157.pdf", "date": "23.09.2026"},
            {"name": "Deutscher Bundestag, Abstimmung am 25.09.2026", "url": "https://www.bundestag.de/dokumente/textarchiv/2026/kw39-de-versicherung-aufsicht-1216898"},
            BREG_SPRIT,
        ],
    },
    {
        "id": "tankrabatt-2022", "cat": "entlastung", "year": 2022,
        "title": "Tankrabatt und 9-Euro-Ticket 2022",
        "value": 5650, "valueNote": "geplante Kosten zusammen",
        "lead": "Von Juni bis August 2022 senkte der Bund die Energiesteuer auf das EU-Minimum – bei Benzin um 29,55 Cent, bei Diesel um 14,04 Cent je Liter. Parallel kostete das 9-Euro-Ticket den Bund 2,5 Mrd. €.",
        "bars": [
            {"label": "Tankrabatt (Steuerausfall, Schätzung)", "v": 3150},
            {"label": "9-Euro-Ticket (Ausgleich an die Länder)", "v": 2500},
        ],
        "points": ["Beide Beträge sind die Planzahlen der Gesetzentwürfe; den tatsächlichen Steuerausfall des Tankrabatts hat die Bundesregierung nicht separat ausgewiesen."],
        "sources": [
            {"name": "Entwurf Energiesteuersenkungsgesetz, Drucksache 20/1741", "url": "https://dserver.bundestag.de/btd/20/017/2001741.pdf", "date": "10.05.2022", "note": "„hat Steuermindereinnahmen für den Bundeshaushalt in Höhe von 3,15 Mrd. Euro zur Folge“"},
            {"name": "Entwurf 7. Gesetz zur Änderung des Regionalisierungsgesetzes, Drucksache 20/1739", "url": "https://dserver.bundestag.de/btd/20/017/2001739.pdf", "date": "10.05.2022"},
        ],
    },
    # ---------------------------------------------------------------- Großprojekte
    {
        "id": "ber", "cat": "projekt", "compare": False,
        "title": "Flughafen BER",
        "value": 5900, "valueNote": "Baukosten statt ursprünglich rund 2 Mrd. €",
        "lead": "Geplant war die Eröffnung am 30. Oktober 2011, eröffnet wurde am 31. Oktober 2020 – neun Jahre später. Die Baukosten der ersten Ausbaustufe stiegen auf rund 5,9 Mrd. €. Eigentümer sind Berlin, Brandenburg und der Bund.",
        "bars": [
            {"label": "Ursprünglich geplant", "v": 2000, "note": "laut Bund der Steuerzahler", "tone": "muted"},
            {"label": "Tatsächliche Baukosten", "v": 5900},
        ],
        "sources": [
            {"name": "Bundesregierung, „Der BER geht ans Netz“", "url": "https://www.bundesregierung.de/breg-de/aktuelles/ber-eroeffnung-1804372", "date": "2020"},
            {"name": "Bund der Steuerzahler, ursprüngliche Kostenplanung", "url": "https://www.steuerzahler.de/publikationen/detail/der-ber-ein-dauerhaftes-zuschussgeschaeft-fuer-steuerzahler/", "note": "Verband, keine amtliche Quelle"},
            {"name": "Ursprünglicher Eröffnungstermin: Verkehrsrundschau", "url": "https://www.verkehrsrundschau.de/nachrichten/transport-logistik/hauptstadtflughafen-oeffnet-spaeter-3007016", "date": "Mai 2012", "note": "Pressebericht"},
        ],
    },
    {
        "id": "s21", "cat": "projekt", "compare": False,
        "title": "Stuttgart 21",
        "value": 14500, "valueNote": "aktuelle Kostenprognose",
        "lead": "Der Finanzierungsvertrag von 2009 ging von rund 3,1 Mrd. € aus. Im Juni 2026 erhöhte die Bahn die Prognose auf 14,5 Mrd. €. Der neue Hauptbahnhof soll im Dezember 2031 vollständig in Betrieb gehen, das Projekt startet stufenweise von 2027 bis 2033.",
        "bars": [
            {"label": "Machbarkeitsstudie 1995", "v": 2450, "tone": "muted"},
            {"label": "Finanzierungsvertrag 2009", "v": 3076, "tone": "muted"},
            {"label": "Prognose Dezember 2024", "v": 10953},
            {"label": "Prognose Juni 2026", "v": 14500},
        ],
        "points": ["Bezahlt wird vor allem von der Deutschen Bahn (also mittelbar vom Bund als Eigentümer), dazu Land, Stadt, Region und EU."],
        "sources": [
            {"name": "Landeshauptstadt Stuttgart, Geänderter Stufenplan (Lenkungskreis 26.06.2026)", "url": "https://www.stuttgart.de/service/aktuelle-meldungen/2026/juni/geaenderter-stufenplan-fuer-inbetriebnahme-ab-dezember-2027", "note": "„die Gesamtwertprognose beträgt nun 14,5 Milliarden Euro“"},
            {"name": "Frühere Kostenstände: Kleine Anfrage, Drucksache 18/3647", "url": "https://dserver.bundestag.de/btd/18/036/1803647.pdf", "note": "Angaben der Fragesteller"},
            {"name": "Präsentation Lenkungskreis Stuttgart 21", "url": "https://www.bahnprojekt-stuttgart-ulm.de/resource/blob/13957438/9acbc79552133e70df6c8af15a5de64c/20260626_Praesentation-Lenkungskreis-Stuttgart-21-data.pdf", "date": "26.06.2026"},
        ],
    },
    {
        "id": "elbphilharmonie", "cat": "projekt", "compare": False,
        "title": "Elbphilharmonie Hamburg",
        "value": 789, "valueNote": "Kosten für die Stadt statt 77 Mio. €",
        "lead": "2005 rechnete Hamburg mit 77 Mio. € aus dem Stadthaushalt, fertig sein sollte das Konzerthaus 2010. Nach mehreren Nachträgen kostete es die Stadt 789 Mio. € – gut zehnmal so viel. Eröffnet wurde im Januar 2017.",
        "bars": [
            {"label": "Machbarkeitsstudie 2005", "v": 77, "tone": "muted"},
            {"label": "Bauvertrag 2006", "v": 142.3, "tone": "muted"},
            {"label": "Nach Nachtrag 4 (2008)", "v": 351.3, "tone": "muted"},
            {"label": "Endgültige Kosten (Neuordnung 2013)", "v": 789},
        ],
        "sources": [
            {"name": "Hamburgische Bürgerschaft, Bericht des Untersuchungsausschusses Elbphilharmonie, Drucksache 20/11500, S. 492", "url": "https://www.buergerschaft-hh.de/parldok/dokument/44803/bericht_des_parlamentarischen_untersuchungsausschusses_elbphilharmonie.pdf", "date": "03.04.2014"},
            {"name": "Senatsbeschluss 2013, berichtet vom Deutschen Musikinformationszentrum", "url": "https://miz.org/de/nachrichten/bau-der-elbphilharmonie-steigt-auf-789-mio-euro-n10023"},
        ],
    },
    {
        "id": "maut", "cat": "projekt", "year": 2023,
        "title": "Gescheiterte Pkw-Maut",
        "value": 270, "valueNote": "Schadensersatz an die vorgesehenen Betreiber",
        "lead": "2019 kippte der Europäische Gerichtshof die „Ausländer-Maut“, die Verträge mit den Betreibern waren da schon unterschrieben. Der Bund zahlte 2023 nach einem Schiedsverfahren 243 Mio. € Schadensersatz, 2025 kamen rund 27 Mio. € aus einem zweiten Verfahren hinzu. Eingenommen hat die Maut nie einen Euro.",
        "bars": [
            {"label": "Ursprüngliche Forderung der Betreiber", "v": 700, "note": "über", "tone": "muted"},
            {"label": "Schadensersatz 2023", "v": 243},
            {"label": "Zweites Schiedsverfahren 2025", "v": 27},
            {"label": "Anwaltskosten bis Feb. 2021", "v": 5.5},
        ],
        "sources": [
            {"name": "Bundesverkehrsministerium, „Schadensersatz – Pkw-Maut“ (archivierte Fassung)", "url": "https://www.heuking.de/fileadmin/Aktuelles/BMDV_PM_Schadensersatz_PKW-Maut_1398.pdf", "date": "Juli 2023", "note": "„Danach muss die Bundesrepublik Deutschland 243 Millionen Schadensersatz bezahlen.“"},
            {"name": "beck-aktuell: Gesamtzahlung rund 270 Mio. € (Auskunft des Verkehrsministeriums an dpa)", "url": "https://www.beck-aktuell.de/heute-im-recht/rechtspolitik-gesetzgebung/gescheiterte-pkw-maut-kosten-steuerzahler-millionen-2025-09-04", "date": "04.09.2025", "note": "Pressebericht"},
            {"name": "Deutscher Bundestag, hib 231/2021 (Anwaltskosten, Drucksache 19/26680)", "url": "https://www.bundestag.de/presse/hib/824188-824188"},
        ],
    },
    # ---------------------------------------------------------------- Steuern
    {
        "id": "schaumwein", "cat": "steuer", "year": 2025,
        "title": "Schaumweinsteuer: seit 1902",
        "value": 364.6, "valueNote": "Einnahmen 2025",
        "lead": "Eingeführt im Kaiserreich, um die Flotte zu bauen – die Flotte gibt es längst nicht mehr, die Steuer schon. Je 0,75-Liter-Flasche Sekt sind es 1,02 €; für 2027 ist eine Erhöhung um 20 % geplant.",
        "bars": [
            {"label": "Kaffeesteuer", "v": 1037.9},
            {"label": "Biersteuer (geht an die Länder)", "v": 539.7},
            {"label": "Schaumweinsteuer", "v": 364.6},
            {"label": "Zwischenerzeugnissteuer (z. B. Sherry, Portwein)", "v": 23.0},
            {"label": "Alkopopsteuer", "v": 0.237, "text": "−0,2 Mio. €", "note": "2025 mehr erstattet als eingenommen"},
        ],
        "points": ["Die Herkunft aus der Flottenfinanzierung 1902 ist gut belegt, eine amtliche Primärquelle dazu verlinken wir nicht."],
        "sources": [
            BMF_STEUER,
            {"name": "Wissenschaftliche Dienste des Bundestags, Wirtschaftliche Auswirkungen der Schaumweinsteuer, WD 5 - 3000 - 095/26", "url": "https://www.bundestag.de/resource/blob/1211602/WD-5-095-26_wirtschaftliche_auswirkungen_schaumweinsteuer.pdf", "date": "03.09.2026"},
        ],
    },
    {
        "id": "hundesteuer", "cat": "steuer", "year": 2025,
        "title": "Hundesteuer",
        "value": 429.7, "valueNote": "Einnahmen der Gemeinden 2025",
        "lead": "Die Hundesteuer bringt den Gemeinden mehr ein als die Schaumweinsteuer dem Bund. Mit 429,9 Mio. € war 2024 ein Rekordjahr. Zweckgebunden ist sie nicht – sie zahlt also nicht für Hundekotbeutel, sondern fließt in den allgemeinen Haushalt.",
        "sources": [{"name": "Statistisches Bundesamt, Pressemitteilung zur Hundesteuer", "url": "https://www.destatis.de/DE/Presse/Pressemitteilungen/2026/10/PD26_N069_73.html", "date": "07.10.2026"}],
    },
    {
        "id": "soli", "cat": "steuer", "year": 2025,
        "title": "Solidaritätszuschlag",
        "value": 12878, "valueNote": "Einnahmen 2025",
        "lead": "Seit 2021 zahlen rund 90 % der Lohn- und Einkommensteuerpflichtigen keinen Soli mehr, weitere 6,5 % nur teilweise. Trotzdem bringt er dem Bund noch fast 13 Mrd. € im Jahr – vor allem von Unternehmen, Kapitalerträgen und hohen Einkommen.",
        "bars": [
            {"label": "auf Lohnsteuer", "v": 4085},
            {"label": "auf veranlagte Einkommensteuer", "v": 3534},
            {"label": "auf Körperschaftsteuer (Unternehmen)", "v": 2236},
            {"label": "auf Dividenden u. a. (nicht veranlagte Steuern vom Ertrag)", "v": 1660},
            {"label": "auf Abgeltungsteuer (Zinsen, Kursgewinne)", "v": 1363},
        ],
        "sources": [
            BMF_STEUER,
            {"name": "Bundesfinanzministerium, Monatsbericht 01/2021: Steueränderungen 2021", "url": "https://www.bundesfinanzministerium.de/Monatsberichte/2021/01/Inhalte/Kapitel-3-Analysen/3-1-wichtigste-steueraenderungen-2021.html"},
        ],
    },
    {
        "id": "top-steuern", "cat": "steuer", "year": 2025,
        "title": "Die größten Steuern",
        "value": 310200, "valueNote": "Umsatzsteuer 2025 – die größte Einzelsteuer",
        "lead": "Fast jeder dritte Steuer-Euro stammt aus der Mehrwertsteuer (einschließlich Einfuhrumsatzsteuer). Insgesamt nahmen Bund und Länder 2025 rund 902 Mrd. € ein, dazu kommen die Gemeindesteuern.",
        "bars": [
            {"label": "Umsatzsteuer (inkl. Einfuhr)", "v": 310200},
            {"label": "Lohnsteuer", "v": 262700},
            {"label": "Veranlagte Einkommensteuer", "v": 78400},
            {"label": "Gewerbesteuer (Gemeinden, brutto)", "v": 76400},
        ],
        "sources": [
            BMF_STEUER,
            {"name": "Statistisches Bundesamt, Pressemitteilung Realsteuern 2025", "url": "https://www.destatis.de/DE/Presse/Pressemitteilungen/2026/10/PD26_369_712.html", "date": "15.10.2026"},
        ],
    },
    # ---------------------------------------------------------------- Staat & Politik
    {
        "id": "kirchen", "cat": "politik", "year": 2025,
        "title": "Staatsleistungen an die Kirchen",
        "value": 657, "valueNote": "2025, gezahlt von den Ländern",
        "lead": "Als Ausgleich für Enteignungen von 1803 zahlen 14 Länder den Kirchen jedes Jahr Geld – unabhängig von der Kirchensteuer. Das Grundgesetz verlangt seit 1919 (Weimarer Verfassung), diese Zahlungen gegen eine Entschädigung abzulösen; geschehen ist das bis heute nicht.",
        "points": ["Seit 1949 summiert sich das auf rund 22 Mrd. € (Zusammenstellung der Humanistischen Union aus den Länderhaushalten). Hamburg und Bremen zahlen nichts."],
        "sources": [
            {"name": "Deutscher Bundestag, hib 286/2026 (Drucksache 21/5212)", "url": "https://www.bundestag.de/presse/hib/kurzmeldungen-1164920", "note": "„belaufen sich auf Grundlage der Haushaltsansätze der Länder für das Jahr 2025 auf rund 657 Millionen Euro“"},
            {"name": "fowid / Humanistische Union, Staatsleistungen 1949–2025", "url": "https://fowid.de/system/files/download/tabelle-sl-1949-2025.pdf", "note": "Verband, keine amtliche Quelle"},
        ],
    },
    {
        "id": "parteien", "cat": "politik", "year": 2026,
        "title": "Staatliche Parteienfinanzierung",
        "value": 232.37, "valueNote": "Obergrenze 2026 für alle Parteien zusammen",
        "lead": "Parteien bekommen Geld für Wählerstimmen und für Spenden und Mitgliedsbeiträge, die sie selbst einwerben. Die Gesamtsumme ist gedeckelt; die Obergrenze steigt jedes Jahr mit der Preisentwicklung, 2026 um 3,1 %.",
        "bars": [
            {"label": "Obergrenze 2025", "v": 225.38},
            {"label": "Obergrenze 2026", "v": 232.37},
        ],
        "sources": [
            {"name": "Deutscher Bundestag, hib 414/2026 (Drucksache 21/5980)", "url": "https://www.bundestag.de/presse/hib/kurzmeldungen-1179042", "date": "20.05.2026"},
            {"name": "Deutscher Bundestag, hib 184/2025 (Drucksache 21/160)", "url": "https://www.bundestag.de/presse/hib/kurzmeldungen-1077396"},
        ],
    },
    {
        "id": "sondervermoegen", "cat": "politik", "compare": False,
        "title": "Die großen Sondervermögen",
        "value": 600000, "valueNote": "zusätzliche Kreditrahmen seit 2022",
        "lead": "„Sondervermögen“ sind Schulden außerhalb der Schuldenbremse, jeweils mit Grundgesetzänderung. 2022 kamen 100 Mrd. € für die Bundeswehr, 2025 weitere 500 Mrd. € für Infrastruktur und Klimaneutralität über zwölf Jahre.",
        "bars": [
            {"label": "Infrastruktur: Bund", "v": 300000},
            {"label": "Infrastruktur: Länder und Kommunen", "v": 100000},
            {"label": "Infrastruktur: Klima- und Transformationsfonds", "v": 100000},
            {"label": "Bundeswehr (2022)", "v": 100000},
        ],
        "points": [
            "Aus dem Infrastruktur-Sondervermögen waren 2025 37,2 Mrd. € eingeplant; ausgezahlt wurden 24,0 Mrd. €.",
            "Das Bundeswehr-Sondervermögen muss ab 2028 mit 3,2 Mrd. € im Jahr getilgt werden.",
        ],
        "sources": [
            {"name": "Grundgesetz Art. 87a Abs. 1a (Bundeswehr)", "url": "https://www.gesetze-im-internet.de/gg/art_87a.html"},
            {"name": "Bundesfinanzministerium, FAQ Sondervermögen Infrastruktur und Klimaneutralität", "url": "https://www.bundesfinanzministerium.de/Content/DE/FAQ/SVIK/sondervermoegen-infrastruktur-klimaneutralitaet.html"},
            {"name": "Bundesfinanzministerium, Monatsbericht 01/2026: Abschluss Bundeshaushalt, KTF und SVIK 2025", "url": "https://www.bundesfinanzministerium.de/Monatsberichte/Ausgabe/2026/01/Inhalte/Kapitel-2-Analysen/2-1-abschluss-bundeshaushalt-ktf-svik-2025.html"},
        ],
    },
    {
        "id": "zinsen", "cat": "politik", "year": 2025,
        "title": "Zinsen des Bundes",
        "value": 29873, "valueNote": "Zinsausgaben 2025 (vorläufiges Ist)",
        "lead": "Für seine Schulden zahlte der Bund 2025 rund 29,9 Mrd. € Zinsen – mehr als das ganze Forschungsministerium kostet (22,5 Mrd. €). 2021 waren es nur rund 4 Mrd. €; der Anstieg kommt vor allem von den gestiegenen Zinsen seit 2022.",
        "bars": [
            {"label": "2024 (Ist)", "v": 34223},
            {"label": "2025 (vorläufiges Ist)", "v": 29873},
        ],
        "points": ["Seit 2025 bucht der Bund Zinsen periodengerecht statt beim Zahlungszeitpunkt; 2025 ist deshalb nur eingeschränkt mit 2024 vergleichbar."],
        "sources": [{"name": "Bundesfinanzministerium, Monatsbericht 01/2026: Abschluss Bundeshaushalt 2025", "url": "https://www.bundesfinanzministerium.de/Monatsberichte/Ausgabe/2026/01/Inhalte/Kapitel-2-Analysen/2-1-abschluss-bundeshaushalt-ktf-svik-2025.html"}],
    },
]


def main():
    ids = [f["id"] for f in FACTS]
    assert len(ids) == len(set(ids)), "duplicate id"
    for f in FACTS:
        assert f["cat"] in CATEGORIES and f["sources"], f["id"]
    OUT.write_text(json.dumps({"updated": UPDATED, "categories": CATEGORIES, "facts": FACTS}, ensure_ascii=False, separators=(",", ":")))
    print("wrote", OUT, OUT.stat().st_size, "bytes,", len(FACTS), "facts")


if __name__ == "__main__":
    main()
