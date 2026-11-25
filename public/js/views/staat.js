// View "Gesamtstaat": income and spending of general government and its levels (Eurostat, ESA 2010).
import { h, conv, fmt, pct, kpi, change, seg, yearPicker, unitPicker, field, drill, timeChart, theme, UNITS } from "../lib.js";

export const title = "Gesamtstaat";

export const SECTORS = {
  S13: "Staat gesamt",
  S1311: "Bund",
  S1312: "Länder",
  S1313: "Gemeinden",
  S1314: "Sozialversicherung",
};
const SECTOR_TEXT = {
  S13: "Bund, Länder, Gemeinden und Sozialversicherungen zusammen, Zahlungen zwischen den Ebenen herausgerechnet.",
  S1311: "Bund einschließlich Extrahaushalten und Sondervermögen (Zentralstaat). Enthält Zuschüsse an Sozialversicherung und Länder.",
  S1312: "Alle 16 Länder zusammen, einschließlich ihrer Extrahaushalte.",
  S1313: "Alle Gemeinden und Gemeindeverbände (Kreise) zusammen.",
  S1314: "Renten-, Kranken-, Pflege-, Arbeitslosen- und Unfallversicherung.",
};

const memo = new Map();
function cached(key, fn) {
  if (!memo.has(key)) memo.set(key, fn());
  return memo.get(key);
}

function N(id, label, value, children, hint) {
  const n = { id, label, value };
  if (hint) n.hint = hint;
  const kids = (children || []).filter((c) => c.value != null && Math.abs(c.value) >= 0.5);
  if (kids.length > 1) n.children = kids;
  return n;
}

function getter(S, sector, year) {
  const i = S.years.indexOf(year);
  const m = S.main[sector] || {};
  return (k) => (i < 0 ? null : (m[k]?.[i] ?? null));
}

/** Expenditure by economic type (ESA). */
function treeArt(S, sector, year) {
  const g0 = getter(S, sector, year);
  const TE = g0("TE");
  if (TE == null) return null;
  const g = (k) => g0(k) ?? 0;
  const kids = [
    N("soz", "Sozialleistungen", g("D62PAY") + g("D632PAY"), [
      N("D62PAY", "Geldleistungen (Renten, Pensionen, Arbeitslosen-, Kinder-, Bürgergeld …)", g("D62PAY")),
      N("D632PAY", "Sachleistungen (z. B. Arzt-, Klinik- und Pflegeleistungen der Kassen)", g("D632PAY")),
    ]),
    N("D1PAY", "Personal (Gehälter, Sozialbeiträge der Arbeitgeber)", g("D1PAY")),
    N("P2", "Sachaufwand (Vorleistungen)", g("P2")),
    N("inv", "Investitionen", g("P5") + g("NP")),
    N("D4PAY", "Zinsen", g("D4PAY")),
    N("D3PAY", "Subventionen", g("D3PAY")),
    N("D7PAY", "Laufende Transfers", g("D7PAY"), [
      N("D73PAY", "an andere staatliche Ebenen", g("D73PAY")),
      N("D76PAY", "EU-Eigenmittel (Mehrwertsteuer- und BNE-basiert)", g("D76PAY")),
      N("D74PAY", "Internationale Zusammenarbeit", g("D74PAY")),
      N("D7X", "Übrige (u. a. an Organisationen ohne Erwerbszweck)", g("D7PAY") - g("D73PAY") - g("D74PAY") - g("D76PAY")),
    ]),
    N("D9PAY", "Vermögenstransfers", g("D9PAY"), [
      N("D92PAY", "Investitionszuschüsse", g("D92PAY")),
      N("D9X", "Sonstige Vermögenstransfers", g("D9PAY") - g("D92PAY")),
    ]),
  ];
  const rest = TE - kids.reduce((a, k) => a + k.value, 0);
  if (Math.abs(rest) >= TE * 0.0005) kids.push(N("rest", "Sonstiges (Steuern, Abgaben u. Ä.)", rest));
  return { id: "root", label: "Ausgaben", value: TE, children: kids };
}

/** Expenditure by function (COFOG level I + II). */
function treeCofog(S, sector, year) {
  const i = S.years.indexOf(year);
  const c = S.cofog[sector];
  if (!c || i < 0 || c.TOTAL?.[i] == null) return null;
  const L = S.labels.cofog;
  const top = Object.keys(c).filter((k) => /^GF\d\d$/.test(k));
  const kids = top.map((k) =>
    N(
      k,
      L[k] || k,
      c[k][i] ?? 0,
      Object.keys(c)
        .filter((s) => s.length === 6 && s.startsWith(k))
        .map((s) => Object.assign(N(s, L[s] || s, c[s][i]), { code: s.slice(2, 4) + "." + +s.slice(4) })),
    ),
  );
  kids.forEach((k) => (k.code = k.id.slice(2)));
  return { id: "root", label: "Ausgaben", value: c.TOTAL[i], children: kids };
}

/** Revenue by type (ESA). */
function treeEinnahmen(S, sector, year) {
  const g0 = getter(S, sector, year);
  const TR = g0("TR");
  if (TR == null) return null;
  const g = (k) => g0(k) ?? 0;
  const kids = [
    N("D2REC", "Steuern auf Produktion und Importe", g("D2REC"), [
      N("D211REC", "Mehrwertsteuer", g("D211REC")),
      N("D21X", "Weitere Gütersteuern (Energie-, Tabak-, Versicherungsteuer …)", g("D21REC") - g("D211REC")),
      N("D29REC", "Sonstige Produktionsabgaben (u. a. Grundsteuer)", g("D29REC")),
    ]),
    N("D5REC", "Steuern auf Einkommen und Vermögen", g("D5REC"), [
      N("D51A_C1REC", "Lohn- und Einkommensteuer (private Haushalte)", g("D51A_C1REC")),
      N("D51B_C2REC", "Steuern auf Gewinne von Kapitalgesellschaften", g("D51B_C2REC")),
      N("D5X", "Sonstige direkte Steuern", g("D5REC") - g("D51A_C1REC") - g("D51B_C2REC")),
    ]),
    N("D61REC", "Sozialbeiträge", g("D61REC"), [
      N("D611REC", "Beiträge der Arbeitgeber", g("D611REC")),
      N("D613REC", "Beiträge der Versicherten", g("D613REC")),
      N("D61X", "Sonstige (u. a. unterstellte Beiträge für Beamte)", g("D61REC") - g("D611REC") - g("D613REC")),
    ]),
    N("P11_P12_P131", "Verkäufe, Gebühren und Entgelte", g("P11_P12_P131")),
    N("D4REC", "Vermögenseinkommen (Zinsen, Gewinnausschüttungen)", g("D4REC")),
    N("D7REC", "Laufende Transfers", g("D7REC"), [
      N("D73REC", "von anderen staatlichen Ebenen", g("D73REC")),
      N("D7RX", "Übrige", g("D7REC") - g("D73REC")),
    ]),
    N("D9REC", "Vermögenstransfers", g("D9REC"), [
      N("D91REC", "Erbschaft- und Schenkungsteuer u. Ä.", g("D91REC")),
      N("D9RX", "Übrige (u. a. Investitionszuschüsse)", g("D9REC") - g("D91REC")),
    ]),
  ];
  const rest = TR - kids.reduce((a, k) => a + k.value, 0);
  if (Math.abs(rest) >= TR * 0.0005) kids.push(N("rest", "Sonstiges (u. a. empfangene Subventionen)", rest));
  return { id: "root", label: "Einnahmen", value: TR, children: kids };
}

export function render(root, { data, params, set }) {
  const S = data.staat;
  const years = S.years;
  const sector = SECTORS[params.get("s")] ? params.get("s") : "S13";
  let year = +params.get("y") || years[years.length - 1];
  if (!years.includes(year)) year = years[years.length - 1];
  const unit = UNITS[params.get("u")] ? params.get("u") : "eur";
  const art = params.get("a") === "art" ? "art" : "cofog";
  const onYear = (y) => set({ y });

  const g = (k, y = year) => getter(S, sector, y)(k);
  const i = years.indexOf(year);
  const debtS = S.debt[sector]?.GD || [];

  // ----- header & controls
  root.append(
    h(
      "header",
      { class: "view-head" },
      h("h1", {}, "Öffentliche Finanzen ", h("span", { class: "accent" }, SECTORS[sector])),
      h("p", { class: "lead" }, SECTOR_TEXT[sector]),
    ),
    h(
      "div",
      { class: "controls" },
      field("Ebene", seg(Object.entries(SECTORS), sector, (s) => set({ s }), { label: "Ebene" })),
      field("Jahr", yearPicker(years, year, onYear)),
      field("Einheit", unitPicker(unit, (u) => set({ u }))),
    ),
  );

  // ----- KPIs
  const TE = g("TE"),
    TR = g("TR"),
    B9 = g("B9"),
    GD = debtS[i] ?? null;
  const prev = years[i - 1];
  root.append(
    h(
      "section",
      { class: "kpis" },
      kpi("Ausgaben", fmt(conv(TE, year, unit), unit), unit === "bip" ? (sector === "S13" ? "Staatsquote" : "in % des BIP") : pct((TE / S.gdp[i]) * 100) + " des BIP", change(TE, g("TE", prev))),
      kpi("Einnahmen", fmt(conv(TR, year, unit), unit), unit === "bip" ? (sector === "S13" ? "Einnahmenquote" : "in % des BIP") : pct((TR / S.gdp[i]) * 100) + " des BIP", change(TR, g("TR", prev))),
      kpi(B9 >= 0 ? "Überschuss" : "Defizit", fmt(conv(B9, year, unit), unit, true), unit === "bip" ? "Finanzierungssaldo" : pct((B9 / S.gdp[i]) * 100) + " des BIP (Maastricht: max. −3 %)"),
      kpi("Schuldenstand", fmt(conv(GD, year, unit), unit), GD == null ? "keine Daten" : unit === "bip" ? "Schuldenquote, Jahresende" : pct((GD / S.gdp[i]) * 100) + " des BIP, Jahresende", change(GD, debtS[i - 1])),
    ),
  );

  // ----- Ausgaben
  const cofogYears = years.filter((y) => cached(`c|${sector}|${y}`, () => treeCofog(S, sector, y)));
  const lastCofog = cofogYears[cofogYears.length - 1];
  const cofogYear = cofogYears.includes(year) ? year : year > lastCofog ? lastCofog : null;
  const expYear = art === "cofog" ? cofogYear : year;
  const expYears = art === "cofog" ? cofogYears : years;
  const expTree = (y) => (art === "cofog" ? cached(`c|${sector}|${y}`, () => treeCofog(S, sector, y)) : cached(`a|${sector}|${y}`, () => treeArt(S, sector, y)));
  root.append(
    h(
      "section",
      { class: "card" },
      h(
        "div",
        { class: "card-head" },
        h("h2", {}, "Wofür wird das Geld ausgegeben?"),
        seg(
          [
            ["cofog", "nach Aufgaben"],
            ["art", "nach Art"],
          ],
          art,
          (a) => set({ a }),
          { label: "Gliederung der Ausgaben" },
        ),
      ),
      h(
        "p",
        { class: "sub" },
        art === "cofog"
          ? "Gliederung nach Aufgabenbereichen (COFOG). Klick auf ein Segment oder eine Zeile zeigt die Unterbereiche."
          : "Gliederung nach ökonomischer Art der Ausgabe. Klick auf ein Segment oder eine Zeile zeigt Details.",
      ),
      expYear == null
        ? h("p", { class: "empty" }, "Für dieses Jahr liegen keine Daten nach Aufgaben vor.")
        : drill({
            key: `staat-exp-${art}-${sector}`,
            rootLabel: "Alle Ausgaben",
            tree: expTree,
            years: expYears,
            year: expYear,
            unit,
            onYear,
            note:
              expYear !== year
                ? `Die Aufteilung nach Aufgaben erscheint mit gut einem Jahr Verzögerung – gezeigt wird ${expYear}, das neueste verfügbare Jahr.`
                : sector !== "S13"
                  ? "Hinweis: Auf einzelnen Ebenen sind Zahlungen an andere Ebenen enthalten (z. B. Bundeszuschuss an die Rentenversicherung)."
                  : null,
          }),
    ),
  );

  // ----- Einnahmen
  root.append(
    h(
      "section",
      { class: "card" },
      h("div", { class: "card-head" }, h("h2", {}, "Woher kommt das Geld?")),
      h("p", { class: "sub" }, "Einnahmen nach Art. Klick auf eine Kategorie zeigt die einzelnen Steuern bzw. Beiträge."),
      drill({
        key: `staat-inc-${sector}`,
        rootLabel: "Alle Einnahmen",
        tree: (y) => cached(`e|${sector}|${y}`, () => treeEinnahmen(S, sector, y)),
        years,
        year,
        unit,
        onYear,
      }),
    ),
  );

  // ----- Over the years
  const t = theme();
  const balEl = h("div", { class: "chart" });
  const lineEl = h("div", { class: "chart" });
  root.append(
    h(
      "section",
      { class: "card" },
      h("div", { class: "card-head" }, h("h2", {}, `Einnahmen und Ausgaben seit ${years[0]}`)),
      h("p", { class: "sub" }, "Klick in ein Diagramm wählt das Jahr."),
      lineEl,
      h("h3", { class: "chart-title" }, "Finanzierungssaldo (Überschuss / Defizit)"),
      balEl,
    ),
  );
  requestAnimationFrame(() => {
    const ser = (k) => years.map((y) => conv(g(k, y), y, unit));
    timeChart(lineEl, {
      years,
      unit,
      year,
      onYear,
      series: [
        { name: "Einnahmen", data: ser("TR"), color: t.series[0] },
        { name: "Ausgaben", data: ser("TE"), color: t.series[1] },
      ],
    });
    timeChart(balEl, {
      years,
      unit,
      year,
      onYear,
      series: [{ name: "Saldo", type: "bar", data: ser("B9"), signColors: true }],
      valueFmt: (v) => fmt(v, unit, true),
      refLines: unit === "bip" && sector === "S13" ? [{ y: -3, label: "−3 %-Grenze" }] : [],
    });
  });
}
