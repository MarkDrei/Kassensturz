#!/usr/bin/env python3
"""Refugee- and asylum-related figures for Germany -> public/data/flucht.json.

Fetched (HTML tables, Statistisches Bundesamt):
  - Asylbewerberleistungen: Brutto-/Nettoausgaben 1994 ff. (1 000 EUR)
    https://www.destatis.de/DE/Themen/Gesellschaft-Umwelt/Soziales/Asylbewerberleistungen/Tabellen/liste-ausgaben-einnahmen-ew.html
  - Empfänger von Asylbewerberleistungen am 31.12., 1994 ff.
    https://www.destatis.de/DE/Themen/Gesellschaft-Umwelt/Soziales/Asylbewerberleistungen/Tabellen/4-1-zv-empf-ausschl-bes-lstg-geschl.html
  - Schutzsuchende am 31.12. (Ausländerzentralregister), 2007 ff.
    https://www.destatis.de/DE/Themen/Gesellschaft-Umwelt/Bevoelkerung/Migration-Integration/Tabellen/schutzsuchende-zeitreihe-schutzstatus.html

Transcribed from official PDF tables (no machine-readable version exists; every value was checked
against the PDF text, source per year below):
  - BMF: Flüchtlingsbezogene Ausgaben und Mindereinnahmen des Bundeshaushalts (Ist), Mrd. EUR
  - Statistik der Bundesagentur für Arbeit (in Antworten der Bundesregierung): Jahressumme der
    Zahlungsansprüche im SGB II (Bürgergeld) nach Staatsangehörigkeit, EUR

Usage: python3 scripts/fetch_flucht.py
"""
import datetime, html, json, re, sys, urllib.request
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "public" / "data" / "flucht.json"
D = "https://www.destatis.de/DE/Themen/Gesellschaft-Umwelt/"
URL_ASYL_AUSG = D + "Soziales/Asylbewerberleistungen/Tabellen/liste-ausgaben-einnahmen-ew.html"
URL_ASYL_EMPF = D + "Soziales/Asylbewerberleistungen/Tabellen/4-1-zv-empf-ausschl-bes-lstg-geschl.html"
URL_SCHUTZ = D + "Bevoelkerung/Migration-Integration/Tabellen/schutzsuchende-zeitreihe-schutzstatus.html"

# --- BMF table "Flüchtlingsbezogene Ausgaben und Mindereinnahmen des Bundeshaushalts", Ist, Mrd. EUR
BUND_COMPONENTS = [
    ("fluchtursachen", "Fluchtursachenbekämpfung", "Entwicklungszusammenarbeit, humanitäre Hilfe und Stabilisierung in Herkunfts- und Erstaufnahmeländern – Geld, das im Ausland ausgegeben wird."),
    ("aufnahme", "Aufnahme, Registrierung, Unterbringung im Asylverfahren", "U. a. Bundesamt für Migration und Flüchtlinge (BAMF), Bundespolizei, Unterbringung in Bundesimmobilien."),
    ("integration", "Integrationsleistungen", "Integrations- und Sprachkurse, Migrationsberatung, Arbeitsmarktintegration."),
    ("sozial", "Sozialleistungen nach dem Asylverfahren", "Vor allem Bürgergeld-Leistungen des Bundes für anerkannte Flüchtlinge und – seit Juni 2022 – für Geflüchtete aus der Ukraine."),
    ("laender", "Entlastung von Ländern und Kommunen", "Pauschalen und Umsatzsteueranteile, mit denen der Bund Länder und Kommunen bei deren Flüchtlingskosten unterstützt."),
]
# year: (values in order of BUND_COMPONENTS, total, source)
SRC_2845 = ("BT-Drs. 20/2845, Antwort zu Frage 1", "https://dserver.bundestag.de/btd/20/028/2002845.pdf")
BUND = {
    2016: ([6.5, 1.1, 1.6, 1.7, 9.3], 20.1, SRC_2845),
    2017: ([7.3, 1.0, 2.5, 3.7, 6.6], 21.1, SRC_2845),
    2018: ([7.9, 0.9, 2.6, 4.0, 7.5], 23.0, SRC_2845),
    2019: ([8.4, 0.9, 2.6, 4.8, 6.3], 23.1, SRC_2845),
    2020: ([9.9, 1.0, 2.6, 5.5, 3.9], 22.9, SRC_2845),
    2021: ([9.8, 1.0, 2.3, 5.4, 3.0], 21.6, SRC_2845),
    2022: ([12.4, 1.1, 2.3, 8.0, 4.6], 28.4, ("Finanzplan des Bundes 2023 bis 2027, BR-Drs. 321/23, Tabelle 6", "https://dserver.bundestag.de/brd/2023/0321-23.pdf")),
    2023: ([9.8, 1.2, 3.0, 11.8, 3.9], 29.7, ("Finanzplan des Bundes 2024 bis 2028, BR-Drs. 351/24, Tabelle 6", "https://dserver.bundestag.de/brd/2024/0351-24.pdf")),
    2024: ([8.2, 1.3, 3.3, 13.4, 1.8], 28.0, ("Finanzplan des Bundes 2025 bis 2029, BR-Drs. 351/25, Tabelle 8", "https://dserver.bundestag.de/brd/2025/0351-25.pdf")),
    2025: ([6.4, 1.3, 2.6, 13.2, 1.3], 24.8, ("Finanzplan des Bundes 2026 bis 2030, BT-Drs. 21/7301, Tabelle 11", "https://dserver.bundestag.de/btd/21/073/2107301.pdf")),
}
BUND_PLAN = {"source": BUND[2025][2], "years": [2026, 2027, 2028, 2029, 2030], "total": [24.4, 23.2, 23.1, 23.0, 23.0],
             "note": "2026 Soll, 2027 Regierungsentwurf, 2028–2030 Finanzplan"}

# --- SGB II (Bürgergeld) payment claims by citizenship, annual sums, EUR (Statistik der BA)
SGB2_GROUPS = [
    ("deutsche", "Deutsche"),
    ("ukraine", "Ukraine"),
    ("asyl8", "Asylherkunftsländer (Top 8)"),
    ("sonst", "Übrige Ausländer"),
]
SRC_12225 = ("BT-Drs. 20/12225, Anlage Tabelle 2", "https://dserver.bundestag.de/btd/20/122/2012225.pdf")
SGB2 = {  # year: (insgesamt, deutsche, ausländer, ukraine, nicht-europ. Asylherkunftsländer, source)
    2010: (36319689730, 29400705076, 6918010237, 264088607, 736647694, SRC_12225),
    2015: (34864980878, 26614117402, 8250063994, 185345147, 1565224138, SRC_12225),
    2020: (35479721364, 22310155278, 13168946949, 151813214, 6028454590, SRC_12225),
    2022: (36588147096, 21215887986, 15371976538, 2812137657, 5554024583, SRC_12225),
    2023: (42591160674, 22689049893, 19901759077, 5773423848, 6397346554, SRC_12225),
    2024: (46922883477, 24685417369, 22237099800, 6293674215, 7408219210, ("BT-Drs. 21/1069, Anlage Tabelle 1", "https://dserver.bundestag.de/btd/21/010/2101069.pdf")),
    2025: (46652758234, 24900792076, 21751578677, 5989845053, 7233221710, ("BT-Drs. 21/6855, Anlage Tabelle 1", "https://dserver.bundestag.de/btd/21/068/2106855.pdf")),
}


def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "kassensturz-data-fetch"}), timeout=60) as r:
        return r.read().decode("utf-8", "replace")


def rows(url, table=0):
    t = re.findall(r"<table.*?</table>", get(url), re.S)[table]
    out = []
    for r in re.findall(r"<tr.*?</tr>", t, re.S):
        out.append([html.unescape(re.sub(r"<[^>]+>", "", c)).strip() for c in re.findall(r"<t[hd][^>]*>(.*?)</t[hd]>", r, re.S)])
    return out


def num(s):
    s = re.sub(r"[\s r]", "", s)
    return int(s) if re.fullmatch(r"-?\d+", s) else None


def year_rows(url, table, year_re):
    res = {}
    for r in rows(url, table):
        if not r:
            continue
        m = re.match(year_re, r[0])
        if m and len(r) > 2:
            res[int(m[1])] = [num(c) for c in r[1:]]
    return res


def main():
    ausg = year_rows(URL_ASYL_AUSG, 1, r"^(\d{4})")
    empf = year_rows(URL_ASYL_EMPF, 0, r"^(\d{4})")
    schutz = year_rows(URL_SCHUTZ, 0, r"^31\.12\.(\d{4})")
    ya = sorted(ausg)
    ye = sorted(empf)
    ys = sorted(schutz)
    print("asylblg", ya[0], ya[-1], "empf", ye[0], ye[-1], "schutz", ys[0], ys[-1], file=sys.stderr)
    for y in (2016, 2024):
        print(" check", y, ausg.get(y), empf.get(y, [None])[0], schutz.get(y, [None, None, None])[2], file=sys.stderr)
    for y, (vals, tot, _) in BUND.items():
        if abs(sum(vals) - tot) > 0.25:
            print("WARN bund sum", y, sum(vals), tot, file=sys.stderr)

    by = sorted(BUND)
    sy = sorted(SGB2)
    today = datetime.date.today().isoformat()
    out = {
        "source": {
            "asylblg": {"name": "Statistisches Bundesamt, Asylbewerberleistungsstatistik", "urls": [URL_ASYL_AUSG, URL_ASYL_EMPF], "retrieved": today},
            "schutzsuchende": {"name": "Statistisches Bundesamt, Schutzsuchende nach Schutzstatus (Ausländerzentralregister)", "url": URL_SCHUTZ, "retrieved": today},
            "bund": {"name": "Bundesministerium der Finanzen, Flüchtlingsbezogene Ausgaben und Mindereinnahmen des Bundeshaushalts (Ist)",
                     "perYear": {str(y): {"title": BUND[y][2][0], "url": BUND[y][2][1]} for y in by},
                     "note": "Aus PDF-Tabellen übertragen. Laut BMF ist eine genaue Abgrenzung, ob Leistungen ausschließlich flüchtlingsbezogen sind, nicht in jedem Einzelfall möglich."},
            "sgb2": {"name": "Statistik der Bundesagentur für Arbeit, Jahressumme der Zahlungsansprüche von Leistungsberechtigten im SGB II nach Staatsangehörigkeit (in Antworten der Bundesregierung)",
                     "perYear": {str(y): {"title": SGB2[y][5][0], "url": SGB2[y][5][1]} for y in sy},
                     "note": "Zahlungsansprüche (Regelbedarf, Mehrbedarfe, Unterkunftskosten u. a.), ohne Verwaltungskosten und Eingliederungsleistungen. Top 8 = Afghanistan, Eritrea, Irak, Iran, Nigeria, Pakistan, Somalia, Syrien."},
        },
        "bund": {
            "years": by,
            "components": [{"id": c[0], "label": c[1], "desc": c[2], "values": [round(BUND[y][0][i] * 1000) for y in by]} for i, c in enumerate(BUND_COMPONENTS)],
            "total": [round(BUND[y][1] * 1000) for y in by],
            "plan": {**BUND_PLAN, "total": [round(v * 1000) for v in BUND_PLAN["total"]]},
        },
        "sgb2": {
            "years": sy,
            "groups": [{"id": g, "label": l} for g, l in SGB2_GROUPS],
            "total": [round(SGB2[y][0] / 1e6) for y in sy],
            "values": {
                "deutsche": [round(SGB2[y][1] / 1e6) for y in sy],
                "ukraine": [round(SGB2[y][3] / 1e6) for y in sy],
                "asyl8": [round(SGB2[y][4] / 1e6) for y in sy],
                "sonst": [round((SGB2[y][2] - SGB2[y][3] - SGB2[y][4]) / 1e6) for y in sy],
            },
        },
        "asylblg": {
            "years": ya,
            "brutto": [round(ausg[y][0] / 1000) if ausg[y][0] is not None else None for y in ya],
            "netto": [round(ausg[y][2] / 1000) if ausg[y][2] is not None else None for y in ya],
            "empfYears": ye,
            "empfaenger": [empf[y][0] for y in ye],
        },
        "schutzsuchende": {
            "years": ys,
            "total": [schutz[y][2] for y in ys],
            "offen": [schutz[y][3] for y in ys],
            "anerkannt": [schutz[y][4] for y in ys],
            "abgelehnt": [schutz[y][7] if len(schutz[y]) > 7 else None for y in ys],
        },
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")))
    print("wrote", OUT, OUT.stat().st_size, "bytes", file=sys.stderr)


if __name__ == "__main__":
    main()
