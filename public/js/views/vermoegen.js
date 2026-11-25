// View "Vermögen & Erbschaften": private household wealth (Bundesbank), its distribution (ECB DWA)
// and inheritances/gifts covered by the inheritance tax statistics (Destatis).
import { h, conv, fmt, pct, nf, kpi, change, yearPicker, unitPicker, field, drill, timeChart, theme, UNITS } from "../lib.js";

export const title = "Vermögen & Erbschaften";

const DESC = {
  Sachvermögen: "Immobilien und Grundstücke sowie Betriebsvermögen von Selbständigen. Autos, Möbel u. Ä. sind nicht enthalten.",
  Wohnbauten: "Wert der Wohngebäude (ohne Grundstück) im Besitz privater Haushalte – selbst genutzt oder vermietet.",
  "Grund und Boden": "Wert der Grundstücke, vor allem unter Wohngebäuden. Steigende Bodenpreise haben das Vermögen seit 2010 stark erhöht.",
  Geldvermögen: "Bargeld, Bankguthaben, Wertpapiere, Aktien, Fondsanteile, Versicherungs- und Pensionsansprüche.",
  "Bargeld und Einlagen": "Bargeld, Giro-, Tages- und Festgeld, Sparbücher.",
  Wertpapiere: "Anleihen, Aktien, sonstige Unternehmensbeteiligungen und Investmentfonds.",
  "Versicherungen, Pensionsansprüche": "Ansprüche aus Lebens- und Rentenversicherungen, Betriebsrenten und Pensionskassen. Ansprüche an die gesetzliche Rente zählen nicht dazu.",
  Verbindlichkeiten: "Schulden der privaten Haushalte, vor allem Immobilienkredite.",
};

function tree(B, year) {
  const i = B.years.indexOf(year);
  if (i < 0 || B["Reinvermögen"][i] == null) return null;
  const v = (k) => B[k]?.[i] ?? 0;
  const n = (id, label, value, children) => ({ id, label, value, desc: DESC[id], children: children?.filter((c) => Math.abs(c.value) >= 1) });
  const sonst = v("Nichtwohnbauten") + v("Ausrüstungen") + v("Nutztiere und Nutzpflanzungen") + v("Geistiges Eigentum");
  return {
    id: "root",
    label: "Reinvermögen",
    value: v("Reinvermögen"),
    children: [
      n("Sachvermögen", "Sachvermögen (Immobilien u. a.)", v("Sachvermögen"), [
        n("Wohnbauten", "Wohngebäude", v("Wohnbauten")),
        n("Grund und Boden", "Grund und Boden", v("Grund und Boden")),
        Object.assign(n("sonst", "Gewerbebauten, Maschinen u. a. von Selbständigen", sonst), { desc: "Nichtwohnbauten, Ausrüstungen, Nutztiere und -pflanzungen sowie geistiges Eigentum von Einzelunternehmen und Selbständigen." }),
      ]),
      n("Geldvermögen", "Geldvermögen", v("Geldvermögen"), [
        n("Bargeld und Einlagen", "Bargeld und Bankeinlagen", v("Bargeld und Einlagen")),
        n("Wertpapiere", "Wertpapiere, Aktien, Fonds", v("Wertpapiere")),
        n("Versicherungen, Pensionsansprüche", "Versicherungen und Pensionsansprüche", v("Versicherungen, Pensionsansprüche")),
      ]),
      n("Verbindlichkeiten", "abzüglich Schulden", -v("Verbindlichkeiten")),
    ],
  };
}

export function render(root, { data, params, set }) {
  const V = data.vermoegen;
  const S = data.staat;
  const B = V.bilanz;
  const years = B.years;
  let year = +params.get("y") || years[years.length - 1];
  if (!years.includes(year)) year = years[years.length - 1];
  const i = years.indexOf(year);
  const unit = UNITS[params.get("u")] ? params.get("u") : "eur";
  const onYear = (y) => set({ y });
  const t = theme();
  const net = B["Reinvermögen"];

  root.append(
    h(
      "header",
      { class: "view-head" },
      h("h1", {}, "Privatvermögen ", h("span", { class: "accent" }, year)),
      h(
        "p",
        { class: "lead" },
        "Was die privaten Haushalte in Deutschland besitzen – Immobilien, Grundstücke, Geld, Wertpapiere – abzüglich ihrer Schulden. Dazu: wie ungleich es verteilt ist und wie viel jedes Jahr vererbt und verschenkt wird.",
      ),
    ),
    h("div", { class: "controls" }, field("Jahr", yearPicker(years, year, onYear)), field("Einheit", unitPicker(unit, (u) => set({ u })))),
  );

  // ----- KPIs
  const D = V.verteilung;
  const di = D.years.indexOf(year);
  const E = V.erbschaft;
  const ei = E.years.indexOf(year);
  const debtI = S.years.indexOf(year);
  const gd = S.debt.S13?.GD?.[debtI];
  root.append(
    h(
      "section",
      { class: "kpis" },
      kpi("Reinvermögen privater Haushalte", fmt(conv(net[i], year, unit), unit), "Jahresende, nach Abzug der Schulden", change(net[i], net[i - 1])),
      kpi("Je Einwohner", fmt(conv(net[i], year, "kopf"), "kopf"), gd ? `zum Vergleich Staatsschulden: ${fmt(conv(gd, year, "kopf"), "kopf")}` : ""),
      di >= 0 ? kpi("Anteil der reichsten 10 %", pct(D.shares.T10[di]), `untere Hälfte: ${pct(D.shares.B50[di])} des Vermögens`) : kpi("Anteil der reichsten 10 %", "–", `Verteilungsdaten erst ab ${D.years[0]}`),
      di >= 0 ? kpi("Typischer Haushalt (Median)", nf(D.median[di]) + " €", `Durchschnitt: ${nf(D.mean[di])} € je Haushalt`) : null,
      ei >= 0 ? kpi("Erfasste Erbschaften und Schenkungen", fmt(conv(E.gesamt[ei], year, unit), unit), `festgesetzte Steuer: ${fmt(conv(E.steuer[ei], year, unit), unit)}`, change(E.gesamt[ei], E.gesamt[ei - 1])) : null,
    ),
  );

  // ----- Composition
  root.append(
    h(
      "section",
      { class: "card" },
      h("div", { class: "card-head" }, h("h2", {}, "Woraus besteht das Vermögen?")),
      h("p", { class: "sub" }, "Vermögensbilanz der privaten Haushalte (einschließlich Organisationen ohne Erwerbszweck wie Vereine und Kirchen). Klick zeigt Details."),
      drill({ key: "vermoegen", rootLabel: "Reinvermögen", tree: (y) => tree(B, y), years, year, unit, onYear }),
    ),
  );

  // ----- Wealth vs state debt vs GDP
  const cmpEl = h("div", { class: "chart" });
  root.append(
    h(
      "section",
      { class: "card" },
      h("div", { class: "card-head" }, h("h2", {}, "Privatvermögen, Staatsschulden und Wirtschaftsleistung")),
      h("p", { class: "sub" }, "Reinvermögen der privaten Haushalte im Vergleich zu den Schulden des Gesamtstaats und dem BIP. Klick wählt das Jahr."),
      cmpEl,
    ),
  );

  // ----- Distribution
  const shareEl = h("div", { class: "chart" });
  const medEl = h("div", { class: "chart" });
  root.append(
    h(
      "section",
      { class: "card" },
      h("div", { class: "card-head" }, h("h2", {}, "Wie ist das Vermögen verteilt?")),
      h(
        "p",
        { class: "sub" },
        `Anteil am gesamten Nettovermögen der Haushalte, jeweils zum Jahresende (neuester Stand ${D.latest}: reichste 10 % ${pct(D.sharesLatest.T10)}, untere Hälfte ${pct(D.sharesLatest.B50)}).`,
      ),
      shareEl,
      h("h3", { class: "chart-title" }, "Nettovermögen je Haushalt: Durchschnitt und Median"),
      h("p", { class: "note" }, "Der Median ist der Wert des Haushalts genau in der Mitte – die Hälfte hat mehr, die Hälfte weniger. Dass der Durchschnitt " + (D.median.at(-1) ? `rund ${nf(D.mean.at(-1) / D.median.at(-1), 1)}-mal` : "deutlich") + " so hoch liegt, zeigt die Konzentration bei wenigen sehr großen Vermögen."),
      medEl,
      h("p", { class: "note" }, "Quelle: EZB, Distributional Wealth Accounts – eine experimentelle Statistik, die die Gesamtsumme der Vermögensbilanz anhand von Haushaltsbefragungen auf Gruppen verteilt. Deshalb weicht die Gesamtsumme leicht von der Bundesbank-Bilanz oben ab."),
    ),
  );

  // ----- Inheritances
  const erbEl = h("div", { class: "chart" });
  root.append(
    h(
      "section",
      { class: "card" },
      h("div", { class: "card-head" }, h("h2", {}, "Wie viel wird vererbt und verschenkt?")),
      h(
        "p",
        { class: "sub" },
        "Von den Finanzämtern erfasste Erbschaften und Schenkungen (Wert vor Abzug der Freibeträge) und die festgesetzte Erbschaft- und Schenkungsteuer, nach dem Jahr der Steuerfestsetzung.",
      ),
      erbEl,
      h(
        "p",
        { class: "note" },
        "Wichtig: Die Statistik erfasst nur Fälle, die beim Finanzamt zu einer Steuerfestsetzung führen. Die meisten Erbschaften bleiben unter den Freibeträgen (z. B. 400.000 € je Kind) und tauchen gar nicht auf. Wie viel insgesamt vererbt wird, erhebt keine amtliche Statistik; das DIW schätzte 2017 bis zu 400 Mrd. € pro Jahr (Modellrechnung, keine Zählung). ",
        "Große Firmenübertragungen lassen einzelne Jahre stark schwanken.",
      ),
    ),
  );

  requestAnimationFrame(() => {
    const ser = (arr, ys, src) => ys.map((y) => conv(arr[src.indexOf(y)], y, unit));
    timeChart(cmpEl, {
      years,
      unit,
      year,
      onYear,
      series: [
        { name: "Privates Reinvermögen", data: ser(net, years, years), color: t.series[0] },
        { name: "Bruttoinlandsprodukt", data: ser(S.gdp, years, S.years), color: t.series[2] },
        { name: "Staatsschulden", data: ser(S.debt.S13.GD, years, S.years), color: t.series[1] },
      ],
    });
    const dy = D.years;
    const mid = dy.map((_, k) => (D.shares.T10[k] != null && D.shares.B50[k] != null ? +(100 - D.shares.T10[k] - D.shares.B50[k]).toFixed(2) : null));
    timeChart(shareEl, {
      years: dy,
      unit: "bip",
      year,
      onYear,
      total: false,
      valueFmt: (v) => pct(v),
      series: [
        { name: "Untere Hälfte (50 %)", type: "bar", stack: "s", data: D.shares.B50, color: t.series[2] },
        { name: "Mitte (die nächsten 40 %)", type: "bar", stack: "s", data: mid, color: t.series[3] },
        { name: "Reichste 10 % (ohne Top 5 %)", type: "bar", stack: "s", data: dy.map((_, k) => (D.shares.T10[k] != null ? +(D.shares.T10[k] - D.shares.T5[k]).toFixed(2) : null)), color: t.series[0] },
        { name: "Reichste 5 %", type: "bar", stack: "s", data: D.shares.T5, color: t.series[6] },
      ],
    });
    timeChart(medEl, {
      years: dy,
      unit: "kopf",
      year,
      onYear,
      valueFmt: (v) => nf(v) + " €",
      series: [
        { name: "Durchschnitt je Haushalt", data: D.mean, color: t.series[0] },
        { name: "Median je Haushalt", data: D.median, color: t.series[1] },
      ],
    });
    timeChart(erbEl, {
      years: E.years,
      unit,
      year,
      onYear,
      series: [
        { name: "Erbschaften und Vermächtnisse", type: "bar", stack: "e", data: ser(E.erbschaften, E.years, E.years), color: t.series[0] },
        { name: "Schenkungen", type: "bar", stack: "e", data: ser(E.schenkungen, E.years, E.years), color: t.series[4] },
        { name: "Festgesetzte Steuer", data: ser(E.steuer, E.years, E.years), color: t.series[1] },
      ],
    });
  });
}
