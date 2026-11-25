// View "Schulden & BIP": Maastricht debt by level, debt and deficit ratios, interest, GDP.
import { h, conv, fmt, pct, nf, kpi, change, unitPicker, field, timeChart, theme, UNITS } from "../lib.js";

export const title = "Schulden & BIP";

export function render(root, { data, params, set }) {
  const S = data.staat;
  const years = S.years;
  const unit = UNITS[params.get("u")] ? params.get("u") : "eur";
  let year = +params.get("y") || years[years.length - 1];
  if (!years.includes(year)) year = years[years.length - 1];
  const onYear = (y) => set({ y });
  const i = years.indexOf(year);
  const GD = S.debt.S13.GD;
  const B9 = S.main.S13.B9;
  const INT = S.main.S13.D41PAY;
  const t = theme();

  root.append(
    h(
      "header",
      { class: "view-head" },
      h("h1", {}, "Schulden und Wirtschaftsleistung ", h("span", { class: "accent" }, year)),
      h("p", { class: "lead" }, "Schuldenstand nach Maastricht-Abgrenzung (Bund, Länder, Gemeinden, Sozialversicherung inkl. Extrahaushalten) im Verhältnis zum Bruttoinlandsprodukt."),
    ),
    h(
      "div",
      { class: "controls" },
      field(
        "Jahr",
        h(
          "select",
          { "aria-label": "Jahr", onchange: (e) => onYear(+e.target.value) },
          years.map((y) => h("option", { value: y, selected: y === year }, y)),
        ),
      ),
      field("Einheit", unitPicker(unit, (u) => set({ u }))),
    ),
  );

  const q = (v) => (v == null || !S.gdp[i] ? null : (v / S.gdp[i]) * 100);
  root.append(
    h(
      "section",
      { class: "kpis" },
      kpi("Schuldenstand Staat", fmt(conv(GD[i], year, unit), unit), "Jahresende, konsolidiert", change(GD[i], GD[i - 1])),
      kpi("Schuldenquote", pct(q(GD[i])), "Maastricht-Grenze: 60 % des BIP"),
      kpi(B9[i] >= 0 ? "Überschuss" : "Defizit", pct(q(B9[i])), "des BIP – Grenze: −3 %"),
      kpi("Zinsausgaben", fmt(conv(INT[i], year, unit), unit), pct((INT[i] / S.main.S13.TE[i]) * 100) + " der Staatsausgaben", change(INT[i], INT[i - 1])),
      kpi("Bruttoinlandsprodukt", fmt(conv(S.gdp[i], year, unit === "bip" ? "eur" : unit), unit === "bip" ? "eur" : unit), S.gdpGrowth[i] == null ? "" : `real ${S.gdpGrowth[i] >= 0 ? "+" : ""}${nf(S.gdpGrowth[i], 1)} % ggü. Vorjahr`),
    ),
  );

  const levelsEl = h("div", { class: "chart tall" });
  const quoteEl = h("div", { class: "chart" });
  const balEl = h("div", { class: "chart" });
  const intEl = h("div", { class: "chart" });
  const gdpEl = h("div", { class: "chart" });
  const growEl = h("div", { class: "chart" });
  root.append(
    h(
      "section",
      { class: "card" },
      h("div", { class: "card-head" }, h("h2", {}, "Wer hat die Schulden?")),
      h(
        "p",
        { class: "sub" },
        "Schuldenstand der einzelnen Ebenen. Kredite zwischen den Ebenen sind hier doppelt enthalten; die Linie zeigt den bereinigten Schuldenstand des Staates insgesamt.",
      ),
      levelsEl,
    ),
    h(
      "div",
      { class: "grid2" },
      h("section", { class: "card" }, h("h2", {}, "Schuldenquote"), h("p", { class: "sub" }, "Schuldenstand in % des BIP"), quoteEl),
      h("section", { class: "card" }, h("h2", {}, "Defizit / Überschuss"), h("p", { class: "sub" }, "Finanzierungssaldo des Staates in % des BIP"), balEl),
      h("section", { class: "card" }, h("h2", {}, "Zinsausgaben des Staates"), h("p", { class: "sub" }, UNITS[unit].label), intEl),
      h("section", { class: "card" }, h("h2", {}, "Bruttoinlandsprodukt"), h("p", { class: "sub" }, unit === "bip" ? UNITS.eur.label : UNITS[unit].label), gdpEl),
    ),
    h("section", { class: "card" }, h("h2", {}, "Wirtschaftswachstum"), h("p", { class: "sub" }, "Veränderung des realen BIP gegenüber dem Vorjahr in %"), growEl),
  );

  requestAnimationFrame(() => {
    const dy = years.filter((y, j) => S.debt.S1311.GD[j] != null);
    const lv = (sec, c, name) => ({
      name,
      type: "bar",
      stack: "d",
      color: c,
      data: dy.map((y) => conv(S.debt[sec].GD[years.indexOf(y)], y, unit)),
    });
    timeChart(levelsEl, {
      years: dy,
      unit,
      year,
      onYear,
      total: false,
      series: [
        lv("S1311", t.series[0], "Bund"),
        lv("S1312", t.series[1], "Länder"),
        lv("S1313", t.series[2], "Gemeinden"),
        lv("S1314", t.series[3], "Sozialversicherung"),
        { name: "Staat gesamt (bereinigt)", type: "line", color: t.ink, width: 2, data: dy.map((y) => conv(GD[years.indexOf(y)], y, unit)) },
      ],
    });
    const ratio = (arr) => years.map((y, j) => (arr[j] == null || !S.gdp[j] ? null : (arr[j] / S.gdp[j]) * 100));
    timeChart(quoteEl, { years, unit: "bip", year, onYear, series: [{ name: "Schuldenquote", data: ratio(GD), color: t.series[0], area: true }], refLines: [{ y: 60, label: "60 %" }] });
    timeChart(balEl, {
      years,
      unit: "bip",
      year,
      onYear,
      series: [{ name: "Saldo", type: "bar", data: ratio(B9), signColors: true }],
      refLines: [{ y: -3, label: "−3 %" }],
      valueFmt: (v) => fmt(v, "bip", true),
    });
    timeChart(intEl, { years, unit, year, onYear, series: [{ name: "Zinsausgaben", data: years.map((y, j) => conv(INT[j], y, unit)), color: t.series[1], area: true }] });
    const gu = unit === "bip" ? "eur" : unit;
    timeChart(gdpEl, { years, unit: gu, year, onYear, series: [{ name: "BIP", data: years.map((y, j) => conv(S.gdp[j], y, gu)), color: t.series[2], area: true }] });
    timeChart(growEl, {
      years,
      unit: "bip",
      year,
      onYear,
      series: [{ name: "Reales Wachstum", type: "bar", data: S.gdpGrowth, signColors: true }],
      valueFmt: (v) => (v == null ? "–" : (v > 0 ? "+" : "") + nf(v, 1) + " %"),
    });
  });
}
