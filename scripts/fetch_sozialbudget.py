#!/usr/bin/env python3
"""Fetch the BMAS Sozialbudget (social budget of Germany) and write public/data/sozial.json.

Source: Bundesministerium für Arbeit und Soziales, "Sozialbudget <Jahr>", CSV tables linked on
https://www.bmas.de/DE/Service/Publikationen/Broschueren/a230-<nn>-sozialbudget-<jahr>.html
  Tabelle I-2   Leistungen nach Funktionen, 1992 ff. (newest edition)
  Tabelle II    Leistungen nach Institutionen, 1992 ff. (newest edition)
  Tabelle III-2 Leistungen nach Funktionen und Institutionen, one year per file
                (newest edition per year; older editions add older years)

The Sozialbudget follows the EU ESSPROS method and is broader than the state: it also contains
employer systems (Entgeltfortzahlung, Betriebsrenten) and private schemes (PKV, Riester).
Values in Mio EUR. Year flags: p = vorläufig, s = geschätzt.

Usage: python3 scripts/fetch_sozialbudget.py
"""
import csv, datetime, html, io, json, re, sys, time, urllib.error, urllib.request
from pathlib import Path

HOST = "https://www.bmas.de"
PAGE = HOST + "/DE/Service/Publikationen/Broschueren/a230-{nn}-sozialbudget-{year}.html"
OUT = Path(__file__).resolve().parent.parent / "public" / "data" / "sozial.json"


def get(url, tries=3):
    req = urllib.request.Request(url, headers={"User-Agent": "kassensturz-data-fetch"})
    for t in range(tries):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code < 500 or t == tries - 1:
                raise
            time.sleep(2 + 3 * t)


def editions():
    """Newest first: (edition year, page url, [csv urls])."""
    this = datetime.date.today().year
    out = []
    for ed in range(this, 2015, -1):
        url = PAGE.format(nn=ed - 1999, year=ed)
        try:
            page = html.unescape(get(url).decode("utf-8", "replace"))
        except Exception:
            continue
        links = sorted(set(re.findall(r'href="([^"]+\.csv\?__blob=publicationFile[^"]*)"', page)))
        if links:
            out.append((ed, url, [HOST + l if l.startswith("/") else l for l in links]))
            print("edition", ed, len(links), "csv", file=sys.stderr)
    return out


def table(url):
    text = get(url).decode("latin-1")
    return [[c.strip() for c in row] for row in csv.reader(io.StringIO(text), delimiter=";")]


def num(s):
    s = s.strip().replace(".", "").replace(",", ".")
    if s in ("", "-", "x", "."):
        return None
    return round(float(s))


def year_cols(rows):
    """Find the header row with years; return {col index: (year, flag)}."""
    for r in rows:
        ys = {i: re.fullmatch(r"(\d{4})([ps]?)", c) for i, c in enumerate(r)}
        ys = {i: (int(m[1]), m[2]) for i, m in ys.items() if m}
        if len(ys) > 10:
            return ys
    raise ValueError("no year header")


def main():
    eds = editions()
    if not eds:
        sys.exit("no Sozialbudget edition found")
    new_ed, new_page, new_links = eds[0]
    pick = lambda links, part: next(l for l in links if part in l)

    # --- Tabelle II: Leistungen nach Institutionen
    t2_url = pick(new_links, "leistungen-nach-institutionen-")
    rows = table(t2_url)
    cols = year_cols(rows)
    years = [y for y, _ in cols.values()]
    flags = {str(y): f for y, f in cols.values() if f}
    inst, inst_lab, groups = {}, {}, []
    for r in rows:
        if r and re.fullmatch(r"\d{1,2}", r[0]) and r[1]:
            code = r[0]
            if code in inst:  # the % blocks repeat the codes; keep the first (Mio EUR) block
                break
            inst[code] = [num(r[i]) for i in cols]
            inst_lab[code] = r[1].strip()
            if len(code) == 1 and code != "0":
                groups.append({"id": code, "children": []})
            elif len(code) == 2:
                groups[-1]["children"].append(code)

    # --- Tabelle I-2: Leistungen nach Funktionen (+ Verwaltung, Sonstige)
    t12_url = pick(new_links, "sozialbudget-insgesamt-leistungen-finanzierung")
    rows = table(t12_url)
    cols12 = year_cols(rows)
    assert [y for y, _ in cols12.values()] == years
    func = {}
    in_func = False
    for r in rows:
        name = (r[0] or r[1]).strip() if r else ""
        if name.startswith("Leistungen nach Funktionen"):
            if any(k not in ("Verwaltungsausgaben", "Sonstige Ausgaben") for k in func):
                break  # later blocks repeat the table as % structure
            in_func = True
            continue
        if name in ("Verwaltungsausgaben", "Sonstige Ausgaben") and name not in func:
            func[name] = [num(r[i]) for i in cols12]
        elif in_func:
            if not name:
                in_func = False
                continue
            func[name] = [num(r[i]) for i in cols12]

    # --- Tabelle III-2: Funktionen x Institutionen, one file per year, newest edition wins
    matrix, matrix_src = {}, {}
    for ed, page, links in eds:
        for l in links:
            if "funktionen-und-institutionen" not in l:
                continue
            try:
                rows = table(l)
            except Exception as e:
                print("skip", l, e, file=sys.stderr)
                continue
            yr = next((m for r in rows[:8] for c in r if (m := re.fullmatch(r"(\d{4})[ps]?", c))), None)
            if not yr or yr[1] in matrix:
                continue
            head = next(r for r in rows if "Insgesamt" in r)
            m = {}
            for r in rows:
                if r and re.fullmatch(r"\d{1,2}", r[0]):
                    m[r[0]] = {head[i]: num(r[i]) for i in range(2, len(head)) if head[i] and num(r[i]) is not None}
            matrix[yr[1]] = m
            matrix_src[yr[1]] = {"edition": ed, "url": l}

    # checks: institutions add up to the total, functions + admin + other add up to the total
    for j, y in enumerate(years):
        tot = inst["0"][j]
        s = sum(inst[g["id"]][j] or 0 for g in groups)
        if abs(s - tot) > 0.02 * tot:  # the total is consolidated (payments between systems), groups are not
            print("WARN inst sum", y, s, tot, file=sys.stderr)
        f = sum(v[j] or 0 for v in func.values())
        if abs(f - tot) > 5:
            print("WARN func sum", y, f, tot, file=sys.stderr)

    out = {
        "source": {
            "name": "Bundesministerium für Arbeit und Soziales (BMAS), Sozialbudget",
            "edition": new_ed,
            "page": new_page,
            "tables": {"Tabelle II (Institutionen)": t2_url, "Tabelle I-2 (Funktionen)": t12_url},
            "matrix": matrix_src,
            "retrieved": datetime.date.today().isoformat(),
            "unit": "Mio. EUR",
            "note": "p = vorläufig, s = geschätzt. Methode nach ESSPROS; umfasst auch Arbeitgeber- und private Systeme.",
        },
        "years": years,
        "flags": flags,
        "groups": groups,
        "labels": inst_lab,
        "inst": inst,
        "func": func,
        "matrix": dict(sorted(matrix.items())),
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")))
    print("wrote", OUT, OUT.stat().st_size, "bytes; years", years[0], "-", years[-1], "matrix", sorted(matrix), file=sys.stderr)


if __name__ == "__main__":
    main()
