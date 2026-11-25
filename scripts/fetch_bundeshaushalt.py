#!/usr/bin/env python3
"""Fetch the federal budget (Bundeshaushalt) from bundeshaushalt.de and write public/data/bund.json.

Source: Bundesministerium der Finanzen, https://www.bundeshaushalt.de (data API behind the
"Bundeshaushalt digital" visualisation: /internalapi/budgetData). Soll (target) = Haushaltsplan
incl. Nachträge, Ist (actual) = Haushaltsrechnung. Years 2012 onwards.

Per year, quota (soll/ist) and account (ausgaben/einnahmen) we store three classifications,
each with two levels (top level + children of every top-level node):
  single   = Einzelplan -> Kapitel (ministries)
  function = Hauptfunktion -> Oberfunktion (what the money is for)
  group    = Hauptgruppe -> Obergruppe (economic type: personnel, investments, ...)

Usage: python3 scripts/fetch_bundeshaushalt.py
"""
import json, sys, time, urllib.request, urllib.error, datetime
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

API = "https://www.bundeshaushalt.de/internalapi/budgetData"
OUT = Path(__file__).resolve().parent.parent / "public" / "data" / "bund.json"
YEARS = range(2012, datetime.date.today().year + 3)
QUOTAS = {"soll": "target", "ist": "actual"}
ACCOUNTS = {"ausgaben": "expenses", "einnahmen": "income"}
# Income by ministry/function is not meaningful (almost everything sits in EP 60 / Finanzwirtschaft).
UNITS = {"ausgaben": ["single", "function", "group"], "einnahmen": ["group"]}


def get(params, tries=4):
    url = API + "?" + "&".join(f"{k}={v}" for k, v in params.items())
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "kassensturz-data-fetch"})
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None
            time.sleep(2 * (i + 1))
        except Exception:
            time.sleep(2 * (i + 1))
    raise RuntimeError("failed: " + url)


def node(c):
    return {"id": c["id"], "label": c["label"], "v": round(c["value"] / 1e6, 1)}  # Mio EUR


def fetch_tree(year, quota, account, unit):
    base = {"year": year, "account": account, "quota": quota, "unit": unit}
    top = get(base)
    if top is None:
        return None
    children = [node(c) for c in top.get("children", [])]

    def sub(c):
        d = get({**base, "id": c["id"]})
        if d and d.get("children"):
            c["children"] = [node(x) for x in d["children"]]
        return c

    with ThreadPoolExecutor(4) as ex:
        children = list(ex.map(sub, children))
    return {
        "total": round(top["detail"]["value"] / 1e6, 1),
        "modified": top["meta"].get("modifyDate"),
        "children": children,
    }


def main():
    out = {
        "source": {
            "name": "Bundesministerium der Finanzen – bundeshaushalt.de",
            "url": "https://www.bundeshaushalt.de",
            "api": API,
            "retrieved": datetime.date.today().isoformat(),
            "unit": "Mio. EUR",
            "note": "Soll = Haushaltsplan (inkl. Nachtragshaushalte bzw. Regierungsentwurf für künftige Jahre), Ist = Haushaltsrechnung",
        },
        "years": {},
    }
    for y in YEARS:
        for qk, q in QUOTAS.items():
            for ak, a in ACCOUNTS.items():
                for u in UNITS[ak]:
                    t = fetch_tree(y, q, a, u)
                    if t is None:
                        continue
                    out["years"].setdefault(str(y), {}).setdefault(qk, {}).setdefault(ak, {})[u] = t
                    print(y, qk, ak, u, t["total"], file=sys.stderr)
    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")))
    print("wrote", OUT, OUT.stat().st_size, "bytes", file=sys.stderr)


if __name__ == "__main__":
    main()
