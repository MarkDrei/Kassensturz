#!/usr/bin/env python3
"""Fetch private wealth and inheritance data for Germany and write public/data/vermoegen.json.

Sources (all without login):
  1. Deutsche Bundesbank / Destatis, "Sektorale und gesamtwirtschaftliche Vermögensbilanzen":
     xlsx, sheet "S 14 + S 15" (private Haushalte und private Organisationen ohne Erwerbszweck),
     Mrd. EUR am Jahresende, 1999 ff.
  2. Europäische Zentralbank, Distributional Wealth Accounts (DWA, experimentelle Statistik):
     data-api.ecb.europa.eu, households (S14), quarterly 2011 ff.; Q4 values are used per year,
     plus the latest quarter.
  3. Statistisches Bundesamt, Erbschaft- und Schenkungsteuerstatistik (73611), Statistischer Bericht
     (xlsx, CSV sheet 73611-10): steuerlich berücksichtigte Erwerbe nach Festsetzungsjahren.

Usage: python3 scripts/fetch_vermoegen.py
"""
import csv, datetime, html, io, json, re, sys, urllib.request, zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "public" / "data" / "vermoegen.json"
UA = {"User-Agent": "kassensturz-data-fetch"}
BB_PAGE = "https://www.bundesbank.de/de/statistiken/gesamtwirtschaftliche-rechenwerke/vermoegensbilanzen/vermoegensbilanzen-773974"
BB_XLSX = "https://www.bundesbank.de/resource/blob/615826/8c5eb07689a86201cc756793344ec988/472B63F073F071307366337C94F8C870/sektorale-und-gesamtwirtschaftliche-vermoegensbilanzen-xls-data.xlsx"
ECB = "https://data-api.ecb.europa.eu/service/data/DWA/"
DESTATIS_PAGE = "https://www.destatis.de/DE/Themen/Staat/Steuern/Weitere-Steuern/Publikationen/_publikationen-innen-steuer-erbschaft.html"


def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=90) as r:
        return r.read()


# ---------- minimal xlsx reader (stdlib only)
NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main", "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships"}


def xlsx_sheet(data, name):
    """Return the sheet as list of rows ({column letter: value})."""
    z = zipfile.ZipFile(io.BytesIO(data))
    ss = []
    if "xl/sharedStrings.xml" in z.namelist():
        for si in ET.fromstring(z.read("xl/sharedStrings.xml")).findall("m:si", NS):
            ss.append("".join(t.text or "" for t in si.iter("{%s}t" % NS["m"])))
    wb = ET.fromstring(z.read("xl/workbook.xml"))
    rels = {r.get("Id"): r.get("Target") for r in ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))}
    for s in wb.find("m:sheets", NS):
        if s.get("name").strip() != name:
            continue
        tgt = rels[s.get("{%s}id" % NS["r"])].lstrip("/")
        tgt = tgt if tgt.startswith("xl/") else "xl/" + tgt
        rows = []
        for row in ET.fromstring(z.read(tgt)).iter("{%s}row" % NS["m"]):
            out = {}
            for c in row.findall("m:c", NS):
                v, t = c.find("m:v", NS), c.get("t")
                if t == "s" and v is not None:
                    val = ss[int(v.text)]
                elif t == "inlineStr":
                    val = "".join(x.text or "" for x in c.iter("{%s}t" % NS["m"]))
                else:
                    val = v.text if v is not None else ""
                out[re.match(r"[A-Z]+", c.get("r"))[0]] = val.strip()
            rows.append(out)
        return rows
    raise KeyError(name)


def fnum(s):
    try:
        return float(s)
    except (TypeError, ValueError):
        return None


# ---------- 1. Bundesbank balance sheet of households
def bundesbank():
    rows = xlsx_sheet(get(BB_XLSX), "S 14 + S 15")
    head = next(r for r in rows if r.get("A", "").startswith("Lfd"))
    cols = {c: int(v) for c, v in head.items() if re.fullmatch(r"\d{4}", v)}
    years = sorted(cols.values())
    by_nr = {}
    for r in rows:
        nr = r.get("A", "")
        if re.fullmatch(r"\d+", nr):
            by_nr[int(nr)] = [round(fnum(r.get(c)) * 1000) if fnum(r.get(c)) is not None else None for c in sorted(cols, key=cols.get)]
    lab = {1: "Aktiva", 2: "Sachvermögen", 5: "Wohnbauten", 6: "Nichtwohnbauten", 7: "Ausrüstungen", 8: "Nutztiere und Nutzpflanzungen",
           9: "Geistiges Eigentum", 10: "Grund und Boden", 12: "Geldvermögen", 13: "Bargeld und Einlagen", 14: "Wertpapiere",
           15: "Versicherungen, Pensionsansprüche", 17: "Verbindlichkeiten", 18: "Reinvermögen", 20: "Gebrauchsvermögen"}
    # checks: Sachvermögen + Geldvermögen = Aktiva; Aktiva - Verbindlichkeiten = Reinvermögen
    for i, y in enumerate(years):
        a, s, g, l, n = (by_nr[k][i] for k in (1, 2, 12, 17, 18))
        if None in (a, s, g, l, n) or abs(s + g - a) > 200 or abs(a - l - n) > 200:
            print("WARN balance", y, a, s, g, l, n, file=sys.stderr)
    return years, {lab[k]: by_nr[k] for k in lab if k in by_nr}


# ---------- 2. ECB distributional wealth accounts
def ecb(key):
    text = get(f"{ECB}{key}?format=csvdata&startPeriod=2011-Q1").decode()
    out = {}
    for r in csv.DictReader(io.StringIO(text)):
        out.setdefault(r["DWA_GRP"], {})[r["TIME_PERIOD"]] = float(r["OBS_VALUE"])
    return out


def dwa():
    shares = ecb("Q.DE.S14._Z._Z.NWA.B50+T10+T5+T1.PT.S.N")
    mean = ecb("Q.DE.S14.N.LE.NWA._Z.EUR_MN.S.N")["_Z"]
    median = ecb("Q.DE.S14.N.LE.NWA._Z.EUR_MD.S.N")["_Z"]
    total = ecb("Q.DE.S14.N.LE.NWA._Z.EUR.S.N")["_Z"]
    quarters = sorted(total)
    latest = quarters[-1]
    years = sorted({int(q[:4]) for q in quarters if q.endswith("Q4")})
    pick = lambda s: [round(s.get(f"{y}-Q4"), 2) if s.get(f"{y}-Q4") is not None else None for y in years]
    res = {
        "years": years,
        "latest": latest,
        "shares": {g: pick(v) for g, v in shares.items()},
        "sharesLatest": {g: v.get(latest) for g, v in shares.items()},
        "mean": [round(v) if v else None for v in pick(mean)],
        "median": [round(v) if v else None for v in pick(median)],
        "total": [round(v) if v else None for v in pick(total)],
        "latestValues": {"mean": round(mean[latest]), "median": round(median[latest]), "total": round(total[latest])},
    }
    return res


# ---------- 3. Destatis inheritance and gift tax statistics
def erbschaft():
    page = html.unescape(get(DESTATIS_PAGE).decode("utf-8", "replace"))
    links = re.findall(r'href="([^"]*statistischer-bericht-erbschaft-schenkungsteuer-(\d+)\.xlsx[^"]*)"', page)
    if not links:
        raise SystemExit("no Destatis xlsx link found")
    url = max(links, key=lambda l: l[1])[0]
    rows = xlsx_sheet(get(url), "csv-73611-10")
    head = rows[0]
    col = {v: c for c, v in head.items()}
    data = {}
    for r in rows[1:]:
        if r.get(col["Gebiet"]) != "Deutschland" or r.get(col["Masseinheit"]) != "1 000 EUR":
            continue
        y = int(r[col["Festsetzungsjahr"]])
        key = (r[col["Steuerpflichtige_Erwerbe"]], r[col["Merkmal_Name"]])
        data.setdefault(key, {})[y] = round(fnum(r[col["Wert"]]) / 1000)  # -> Mio EUR
    years = sorted({y for v in data.values() for y in v})
    ser = lambda erw, merkmal: [data.get((erw, merkmal), {}).get(y) for y in years]
    out = {
        "years": years,
        "erbschaften": ser("Erwerbe von Todes wegen", "Gesamtwert der Erwerbe vor Abzug"),
        "schenkungen": ser("Schenkungen", "Gesamtwert der Erwerbe vor Abzug"),
        "gesamt": ser("Erwerbe insgesamt", "Gesamtwert der Erwerbe vor Abzug"),
        "steuer": ser("Erwerbe insgesamt", "Tatsächlich festgesetzte Steuer"),
        "steuerErbschaften": ser("Erwerbe von Todes wegen", "Tatsächlich festgesetzte Steuer"),
        "steuerSchenkungen": ser("Schenkungen", "Tatsächlich festgesetzte Steuer"),
    }
    for i, y in enumerate(years):
        if out["gesamt"][i] is not None and abs((out["erbschaften"][i] or 0) + (out["schenkungen"][i] or 0) - out["gesamt"][i]) > 2:
            print("WARN erbschaft sum", y, file=sys.stderr)
    return url, out


def main():
    bb_years, bb = bundesbank()
    print("bundesbank", bb_years[0], bb_years[-1], file=sys.stderr)
    d = dwa()
    print("dwa", d["years"][0], d["latest"], file=sys.stderr)
    erb_url, erb = erbschaft()
    print("erbschaft", erb["years"][0], erb["years"][-1], file=sys.stderr)
    today = datetime.date.today().isoformat()
    out = {
        "source": {
            "bilanz": {"name": "Deutsche Bundesbank / Statistisches Bundesamt, Sektorale und gesamtwirtschaftliche Vermögensbilanzen (Sektor S 14 + S 15)",
                       "page": BB_PAGE, "url": BB_XLSX, "retrieved": today, "unit": "Mio. EUR, Jahresende"},
            "verteilung": {"name": "Europäische Zentralbank, Distributional Wealth Accounts (DWA), experimentelle Statistik, Sektor private Haushalte (S14)",
                           "url": ECB, "series": ["Q.DE.S14._Z._Z.NWA.{B50,T10,T5,T1}.PT.S.N", "Q.DE.S14.N.LE.NWA._Z.{EUR,EUR_MN,EUR_MD}.S.N"],
                           "retrieved": today, "note": "Jahreswerte = 4. Quartal"},
            "erbschaft": {"name": "Statistisches Bundesamt, Erbschaft- und Schenkungsteuerstatistik (73611), Tabelle 73611-10",
                          "page": DESTATIS_PAGE, "url": erb_url, "retrieved": today,
                          "unit": "Mio. EUR, Gesamtwert der Erwerbe vor Abzug von Freibeträgen, unbeschränkt steuerpflichtige Erwerbe, nach Festsetzungsjahr"},
        },
        "bilanz": {"years": bb_years, **bb},
        "verteilung": d,
        "erbschaft": erb,
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")))
    print("wrote", OUT, OUT.stat().st_size, "bytes", file=sys.stderr)


if __name__ == "__main__":
    main()
