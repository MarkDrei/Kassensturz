// View "Bundeshaushalt": the federal core budget (bundeshaushalt.de), Soll and Ist since 2012.
import { h, conv, fmt, pct, kpi, change, seg, yearPicker, unitPicker, field, drill, timeChart, theme, splitLabel, UNITS } from "../lib.js";

export const title = "Bundeshaushalt";

const GLIEDERUNG = [
  ["single", "nach Ministerien"],
  ["function", "nach Aufgaben"],
  ["group", "nach Ausgabeart"],
];
const GLIEDERUNG_TEXT = {
  single: "Gliederung nach Einzelplänen (Ministerien und Verfassungsorgane). Klick zeigt die Kapitel.",
  function: "Gliederung nach dem Funktionenplan (wofür). Klick zeigt die Oberfunktionen.",
  group: "Gliederung nach dem Gruppierungsplan (ökonomische Art). Klick zeigt die Obergruppen.",
};

// Short names for the long official group titles (the official title stays available as tooltip).
const SHORT = {
  "G-0": "Steuern (abzgl. EU-Eigenmittel)",
  "G-1": "Verwaltungseinnahmen, Zinsen, Darlehensrückflüsse",
  "G-2": "Zuweisungen und Zuschüsse",
  "G-3": "Kredite, Investitionszuschüsse",
  "G-4": "Personal",
  "G-5": "Sachausgaben, Rüstung, Zinsen",
  "G-6": "Zuweisungen und Zuschüsse (laufend)",
  "G-7": "Baumaßnahmen",
  "G-8": "Sonstige Investitionen und Förderung",
  "G-9": "Besondere Finanzierungsausgaben",
  "G-01": "Gemeinschaftsteuern (Lohn-, Einkommen-, Umsatzsteuer …)",
  "G-02": "EU-Eigenmittel (Abzug)",
};

function toNode(c) {
  const { code, name } = splitLabel(c.label);
  const n = { id: c.id, code, label: SHORT[c.id] || name, value: c.v };
  if (SHORT[c.id]) n.title = name;
  if (c.children?.length > 1) n.children = c.children.map(toNode);
  return n;
}

function tree(B, year, quota, account, unit) {
  const t = B.years[year]?.[quota]?.[account]?.[unit];
  if (!t) return null;
  return { id: "root", label: account === "ausgaben" ? "Ausgaben" : "Einnahmen", value: t.total, children: t.children.map(toNode) };
}

/** Value of a top-level id (and optionally a child id) in a classification. */
function pick(B, year, quota, account, unit, id, childId) {
  const t = B.years[year]?.[quota]?.[account]?.[unit];
  const c = t?.children.find((x) => x.id === id);
  if (!c) return null;
  if (!childId) return c.v;
  return c.children?.find((x) => x.id === childId)?.v ?? 0;
}

export function render(root, { data, params, set }) {
  const B = data.bund;
  const years = Object.keys(B.years).map(Number).sort();
  const thisYear = new Date().getFullYear();
  let year = +params.get("y") || (years.includes(thisYear) ? thisYear : years[years.length - 1]);
  if (!years.includes(year)) year = years[years.length - 1];
  const hasIst = (y) => !!B.years[y]?.ist;
  let quota = params.get("q") === "ist" ? "ist" : "soll";
  if (quota === "ist" && !hasIst(year)) quota = "soll";
  const gl = GLIEDERUNG.some(([k]) => k === params.get("g")) ? params.get("g") : "single";
  const unit = UNITS[params.get("u")] ? params.get("u") : "eur";
  const onYear = (y) => set({ y });
  const qYears = years.filter((y) => B.years[y]?.[quota]);
  const yd = B.years[year][quota];

  root.append(
    h(
      "header",
      { class: "view-head" },
      h("h1", {}, "Bundeshaushalt ", h("span", { class: "accent" }, year)),
      h(
        "p",
        { class: "lead" },
        "Der Kernhaushalt des Bundes. ",
        quota === "soll" ? "Soll = vom Bundestag beschlossener Plan (bzw. Entwurf, solange nicht beschlossen). " : "Ist = tatsächlich geflossene Beträge laut Haushaltsrechnung. ",
        "Sondervermögen sind nur mit ihren Zuführungen enthalten.",
      ),
    ),
    h(
      "div",
      { class: "controls" },
      field("Jahr", yearPicker(years, year, onYear)),
      field(
        "Werte",
        seg(
          [
            ["soll", "Soll (Plan)"],
            ["ist", "Ist", !hasIst(year)],
          ],
          quota,
          (q) => set({ q }),
          { label: "Soll oder Ist" },
        ),
      ),
      field("Einheit", unitPicker(unit, (u) => set({ u }))),
    ),
  );

  // ----- KPIs
  const prevY = year - 1;
  const v = (y, acc, u, id, child) => pick(B, y, quota, acc, u, id, child);
  const ausg = yd.ausgaben.single.total;
  const steuern = v(year, "einnahmen", "group", "G-0");
  const kredit = v(year, "einnahmen", "group", "G-3", "G-32");
  const zinsen = v(year, "ausgaben", "group", "G-5", "G-57");
  const invest = (y) => {
    const a = v(y, "ausgaben", "group", "G-7"),
      b = v(y, "ausgaben", "group", "G-8");
    return a == null && b == null ? null : (a || 0) + (b || 0);
  };
  const prevTotal = B.years[prevY]?.[quota]?.ausgaben.single.total;
  const sollTotal = B.years[year].soll.ausgaben.single.total;
  root.append(
    h(
      "section",
      { class: "kpis" },
      kpi(
        "Ausgaben",
        fmt(conv(ausg, year, unit), unit),
        quota === "ist" ? `Soll war ${fmt(conv(sollTotal, year, unit), unit)} (${change(ausg, sollTotal) >= 0 ? "+" : ""}${pct(change(ausg, sollTotal))})` : `Stand ${B.years[year].soll.ausgaben.single.modified || ""}`,
        change(ausg, prevTotal),
      ),
      kpi("Steuereinnahmen", fmt(conv(steuern, year, unit), unit), pct((steuern / ausg) * 100) + " der Ausgaben", change(steuern, v(prevY, "einnahmen", "group", "G-0"))),
      kpi("Neue Kredite", fmt(conv(kredit, year, unit), unit), "Schuldenaufnahme am Kreditmarkt, " + pct((kredit / ausg) * 100) + " der Ausgaben", change(kredit, v(prevY, "einnahmen", "group", "G-3", "G-32"))),
      kpi("Zinsausgaben", fmt(conv(zinsen, year, unit), unit), pct((zinsen / ausg) * 100) + " der Ausgaben", change(zinsen, v(prevY, "ausgaben", "group", "G-5", "G-57"))),
      kpi("Investitionen", fmt(conv(invest(year), year, unit), unit), "Hauptgruppen 7 und 8, " + pct((invest(year) / ausg) * 100) + " der Ausgaben", change(invest(year), invest(prevY))),
    ),
  );

  // ----- Ausgaben
  root.append(
    h(
      "section",
      { class: "card" },
      h(
        "div",
        { class: "card-head" },
        h("h2", {}, "Ausgaben des Bundes"),
        seg(GLIEDERUNG, gl, (g) => set({ g }), { label: "Gliederung" }),
      ),
      h("p", { class: "sub" }, GLIEDERUNG_TEXT[gl]),
      drill({
        key: `bund-exp-${gl}-${quota}`,
        rootLabel: "Alle Ausgaben",
        tree: (y) => tree(B, y, quota, "ausgaben", gl),
        years: qYears,
        year,
        unit,
        onYear,
        maxDepth: 2,
      }),
    ),
  );

  // ----- Einnahmen
  root.append(
    h(
      "section",
      { class: "card" },
      h("div", { class: "card-head" }, h("h2", {}, "Einnahmen des Bundes")),
      h(
        "p",
        { class: "sub" },
        "Gliederung nach Einnahmearten. Die Einnahmen enthalten auch neue Kredite – deshalb gleichen sie die Ausgaben immer genau aus. Die EU-Eigenmittel werden von den Steuern abgezogen.",
      ),
      drill({
        key: `bund-inc-${quota}`,
        rootLabel: "Alle Einnahmen",
        tree: (y) => tree(B, y, quota, "einnahmen", "group"),
        years: qYears,
        year,
        unit,
        onYear,
        maxDepth: 2,
      }),
    ),
  );

  // ----- Soll vs Ist over time
  const t = theme();
  const totEl = h("div", { class: "chart" });
  const krEl = h("div", { class: "chart" });
  root.append(
    h(
      "section",
      { class: "card" },
      h("div", { class: "card-head" }, h("h2", {}, `Plan und Wirklichkeit seit ${years[0]}`)),
      h("p", { class: "sub" }, "Ausgaben laut Haushaltsplan (Soll) und tatsächliche Ausgaben (Ist). Klick ins Diagramm wählt das Jahr."),
      totEl,
      h("h3", { class: "chart-title" }, "Neue Kredite am Kreditmarkt"),
      krEl,
    ),
  );
  requestAnimationFrame(() => {
    const s = (q, fn) => years.map((y) => (B.years[y]?.[q] ? conv(fn(y, q), y, unit) : null));
    timeChart(totEl, {
      years,
      unit,
      year,
      onYear,
      series: [
        { name: "Soll", data: s("soll", (y, q) => B.years[y][q].ausgaben.single.total), color: t.series[0] },
        { name: "Ist", data: s("ist", (y, q) => B.years[y][q].ausgaben.single.total), color: t.series[1] },
      ],
    });
    timeChart(krEl, {
      years,
      unit,
      year,
      onYear,
      series: [
        { name: "Soll", type: "bar", data: s("soll", (y, q) => pick(B, y, q, "einnahmen", "group", "G-3", "G-32")), color: t.series[0] },
        { name: "Ist", type: "bar", data: s("ist", (y, q) => pick(B, y, q, "einnahmen", "group", "G-3", "G-32")), color: t.series[1] },
      ],
    });
  });
}
