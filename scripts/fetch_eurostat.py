#!/usr/bin/env python3
"""Fetch general-government finance data for Germany from Eurostat and write public/data/staat.json.

All figures are national accounts (ESA 2010 / ESVG 2010), the same basis Destatis uses for the
Maastricht figures. Sectors: S13 Staat (consolidated), S1311 Bund (Zentralstaat incl. Extrahaushalte),
S1312 Länder, S1313 Gemeinden, S1314 Sozialversicherung.

Datasets (Eurostat dissemination API, https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/):
  gov_10a_main   revenue / expenditure by economic type (Mio EUR)
  gov_10a_exp    expenditure by function, COFOG level I + II (Mio EUR)
  gov_10dd_edpt1 Maastricht debt, deficit (Mio EUR)
  gov_10q_ggdebt quarterly debt by sub-sector; Q4 value is used for sub-sector years missing in edpt1
  nama_10_gdp    GDP current prices, real growth, deflator
  nama_10_pe     population

Usage: python3 scripts/fetch_eurostat.py
"""
import json, sys, urllib.request, datetime
from pathlib import Path

BASE = "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/"
OUT = Path(__file__).resolve().parent.parent / "public" / "data" / "staat.json"
SECTORS = ["S13", "S1311", "S1312", "S1313", "S1314"]


def fetch(ds, **flt):
    q = "&".join(f"{k}={v}" for k, vs in flt.items() for v in (vs if isinstance(vs, list) else [vs]))
    url = f"{BASE}{ds}?format=JSON&lang=de&geo=DE&{q}"
    req = urllib.request.Request(url, headers={"User-Agent": "kassensturz-data-fetch"})
    with urllib.request.urlopen(req, timeout=120) as r:
        d = json.load(r)
    print(ds, d["updated"], file=sys.stderr)
    return d


def parse(d):
    """JSON-stat 2.0 -> (dict{tuple(dim codes): value}, labels{dim:{code:label}}, updated)."""
    ids, sizes = d["id"], d["size"]
    codes = []
    for dim in ids:
        idx = d["dimension"][dim]["category"]["index"]
        codes.append(sorted(idx, key=idx.get))
    strides = [1] * len(sizes)
    for i in range(len(sizes) - 2, -1, -1):
        strides[i] = strides[i + 1] * sizes[i + 1]
    out = []
    for k, v in d["value"].items():
        k = int(k)
        out.append(({ids[i]: codes[i][(k // strides[i]) % sizes[i]] for i in range(len(ids))}, v))
    labels = {dim: d["dimension"][dim]["category"].get("label", {}) for dim in ids}
    return out, labels, d["updated"]


def series(rows, years, keyfn, scale=1, nd=0):
    """Group rows into {key: [value per year]}."""
    res = {}
    for dims, v in rows:
        k = keyfn(dims)
        if k is None:
            continue
        y = int(dims["time"])
        if y not in years:
            continue
        arr = res.setdefault(k, [None] * len(years))
        arr[years.index(y)] = round(v * scale, nd) if nd else round(v * scale)
    return res


def nest(flat):
    """{(a,b): arr} -> {a: {b: arr}}"""
    out = {}
    for (a, b), arr in flat.items():
        out.setdefault(a, {})[b] = arr
    return out


def main():
    MAIN_ITEMS = [
        "TE", "TR", "B9",
        # revenue
        "D2REC", "D211REC", "D21REC", "D29REC", "D5REC", "D51A_C1REC", "D51B_C2REC", "D59REC", "D91REC",
        "D61REC", "D611REC", "D613REC", "P11_P12_P131", "D4REC", "D7REC", "D9REC", "D39REC", "D73REC",
        # expenditure
        "D1PAY", "P2", "D62PAY", "D632PAY", "D3PAY", "D4PAY", "D41PAY", "P5", "NP", "P51G", "D7PAY",
        "D73PAY", "D74PAY", "D76PAY", "D9PAY", "D92PAY", "D29PAY", "D5PAY", "D8",
    ]
    main_d = fetch("gov_10a_main", unit="MIO_EUR", sector=SECTORS, na_item=MAIN_ITEMS)
    exp_d = fetch("gov_10a_exp", unit="MIO_EUR", sector=SECTORS, na_item="TE")
    debt_d = fetch("gov_10dd_edpt1", unit="MIO_EUR", sector=SECTORS,
                   na_item=["GD", "GD_F2", "GD_F31", "GD_F32", "GD_F41", "GD_F42"])
    qdebt_d = fetch("gov_10q_ggdebt", unit="MIO_EUR", sector=SECTORS[1:], na_item="GD")
    gdp_d = fetch("nama_10_gdp", na_item="B1GQ", unit=["CP_MEUR", "CLV_PCH_PRE", "PD20_EUR"])
    pop_d = fetch("nama_10_pe", na_item="POP_NC", unit="THS_PER")

    main_rows, main_lab, main_upd = parse(main_d)
    exp_rows, exp_lab, exp_upd = parse(exp_d)
    debt_rows, debt_lab, debt_upd = parse(debt_d)
    qdebt_rows, _, qdebt_upd = parse(qdebt_d)
    gdp_rows, _, gdp_upd = parse(gdp_d)
    pop_rows, _, pop_upd = parse(pop_d)

    y_main = {int(r[0]["time"]) for r in main_rows if r[0]["na_item"] == "TE" and r[0]["sector"] == "S13"}
    years = list(range(min(y_main), max(y_main) + 1))

    main = nest(series(main_rows, years, lambda d: (d["sector"], d["na_item"])))
    cofog = nest(series(exp_rows, years, lambda d: (d["sector"], d["cofog99"])))
    debt = nest(series(debt_rows, years, lambda d: (d["sector"], d["na_item"])))
    q4 = [({**d, "time": d["time"][:4]}, v) for d, v in qdebt_rows if d["time"].endswith("Q4")]
    q4 = series(q4, years, lambda d: d["sector"])
    for sec, arr in q4.items():
        gd = debt.setdefault(sec, {}).setdefault("GD", [None] * len(years))
        for i, v in enumerate(arr):
            if gd[i] is None and v is not None:
                gd[i] = v
    gdp = series(gdp_rows, years, lambda d: d["unit"], nd=2)
    gdp["CP_MEUR"] = [round(v) if v is not None else None for v in gdp["CP_MEUR"]]
    pop = series(pop_rows, years, lambda d: "POP", nd=1)["POP"]

    out = {
        "source": {
            "name": "Eurostat (Staatsfinanzstatistik nach ESVG 2010, gemeldet von Destatis)",
            "datasets": {
                "gov_10a_main": {"label": main_d["label"], "updated": main_upd},
                "gov_10a_exp": {"label": exp_d["label"], "updated": exp_upd},
                "gov_10dd_edpt1": {"label": debt_d["label"], "updated": debt_upd},
                "gov_10q_ggdebt": {"label": qdebt_d["label"], "updated": qdebt_upd,
                                   "note": "Q4-Werte als Jahresendstand der Teilsektoren vor 2022"},
                "nama_10_gdp": {"label": gdp_d["label"], "updated": gdp_upd},
                "nama_10_pe": {"label": pop_d["label"], "updated": pop_upd},
            },
            "url": "https://ec.europa.eu/eurostat/databrowser/view/gov_10a_main/default/table",
            "api": BASE,
            "retrieved": datetime.date.today().isoformat(),
            "unit": "Mio. EUR (Bevölkerung: Tsd. Personen)",
        },
        "years": years,
        "sectors": {s: main_lab["sector"].get(s, s) for s in SECTORS},
        "labels": {
            "na_item": {k: main_lab["na_item"].get(k, k) for k in MAIN_ITEMS},
            "cofog": exp_lab["cofog99"],
            "debt": debt_lab["na_item"],
        },
        "main": main,
        "cofog": cofog,
        "debt": debt,
        "gdp": gdp["CP_MEUR"],
        "gdpGrowth": gdp["CLV_PCH_PRE"],
        "deflator": gdp["PD20_EUR"],
        "population": pop,
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")))
    print("wrote", OUT, OUT.stat().st_size, "bytes; years", years[0], "-", years[-1], file=sys.stderr)


if __name__ == "__main__":
    main()
