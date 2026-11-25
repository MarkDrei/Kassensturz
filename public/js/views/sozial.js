// View "Sozialstaat": the BMAS Sozialbudget – social benefits by programme and by life situation (function).
import { h, conv, fmt, pct, kpi, change, seg, yearPicker, unitPicker, field, drill, timeChart, theme, UNITS } from "../lib.js";

export const title = "Sozialstaat";

const GROUP_DESC = {
  1: "Die gesetzlichen Versicherungen, finanziert vor allem aus Beiträgen von Beschäftigten und Arbeitgebern plus Bundeszuschüssen.",
  2: "Kleinere Pflicht- und Zusatzsysteme, darunter auch private: private Kranken- und Pflegeversicherung, Riester-Renten, Versorgungswerke der freien Berufe.",
  3: "Versorgung der Beamtinnen, Beamten und Soldaten: Pensionen, Familienzuschläge, Beihilfe zu Krankheitskosten.",
  4: "Leistungen, die Arbeitgeber direkt zahlen: Lohnfortzahlung im Krankheitsfall, Betriebsrenten, Zusatzversorgung im öffentlichen Dienst.",
  5: "Entschädigung für besondere Opfer, z. B. Kriegs- und Gewaltopfer, Wiedergutmachung für NS-Unrecht.",
  6: "Steuerfinanzierte Leistungen von Bund, Ländern und Gemeinden: Kindergeld, Elterngeld, Bürgergeld, Sozialhilfe, Jugendhilfe, Wohngeld, BAföG.",
};
const INST_DESC = {
  11: "Altersrenten, Erwerbsminderungsrenten, Witwen- und Waisenrenten der gesetzlichen Rentenversicherung sowie Reha-Leistungen und die Krankenversicherungsbeiträge für Rentner.",
  12: "Gesetzliche Krankenversicherung: Ärzte, Krankenhäuser, Arzneimittel, Krankengeld.",
  13: "Soziale Pflegeversicherung: Pflegegeld, ambulante und stationäre Pflege.",
  14: "Gesetzliche Unfallversicherung (Berufsgenossenschaften): Arbeits- und Wegeunfälle, Berufskrankheiten.",
  15: "Arbeitslosengeld, Kurzarbeitergeld, Arbeitsförderung der Bundesagentur für Arbeit.",
  23: "Staatlich geförderte private Altersvorsorge (Riester).",
  24: "Leistungen der privaten Krankenversicherung (Teil des Sozialbudgets, aber kein staatliches System).",
  31: "Ruhegehälter und Hinterbliebenenversorgung für Beamte, Richter und Soldaten von Bund, Ländern und Gemeinden.",
  33: "Zuschüsse des Dienstherrn zu Krankheits- und Pflegekosten von Beamten und Pensionären.",
  41: "Lohnfortzahlung durch den Arbeitgeber in den ersten sechs Wochen einer Krankheit und Zuschuss zum Mutterschaftsgeld.",
  42: "Betriebsrenten aus Direktzusagen und Unterstützungskassen.",
  43: "Zusatzrenten für Beschäftigte des öffentlichen Dienstes (z. B. VBL).",
  61: "Kindergeld und die steuerliche Wirkung der Kinderfreibeträge.",
  63: "Grundsicherung für Arbeitsuchende (bis 2022 „Arbeitslosengeld II“/„Hartz IV“, seit 2005) mit Regelbedarf, Kosten der Unterkunft, Eingliederungsleistungen und Verwaltung der Jobcenter. Vor 2005 lief die Arbeitslosenhilfe unter „Sonstige Arbeitsförderung“.",
  64: "Bis 2004 vor allem die Arbeitslosenhilfe, seitdem kleinere Arbeitsförderungsprogramme.",
  65: "BAföG und Aufstiegs-BAföG.",
  66: "Sozialhilfe (Hilfe zum Lebensunterhalt, Grundsicherung im Alter und bei Erwerbsminderung, Hilfe zur Pflege), Eingliederungshilfe für Menschen mit Behinderung und Leistungen nach dem Asylbewerberleistungsgesetz.",
  67: "Kitas (soweit als Jugendhilfe finanziert), Heimerziehung, Jugendarbeit, Hilfen zur Erziehung, Unterbringung unbegleiteter minderjähriger Geflüchteter.",
  68: "Zuschuss zu Miete oder Wohnkosten für Haushalte mit geringem Einkommen.",
};
const FUNC_DESC = {
  Alter: "Alle Leistungen wegen Alters: gesetzliche Renten, Beamtenpensionen, Pflege im Alter, Betriebs- und Zusatzrenten, Grundsicherung im Alter. Klick zeigt, aus welchen Systemen sie kommen.",
  Krankheit: "Gesundheitsversorgung und Lohnersatz bei Krankheit: Kassenleistungen, private Krankenversicherung, Beihilfe, Lohnfortzahlung.",
  Invalidität: "Leistungen bei Behinderung und Erwerbsminderung: Erwerbsminderungsrenten, Eingliederungshilfe, Pflege jüngerer Menschen.",
  Hinterbliebene: "Witwen-, Witwer- und Waisenrenten und -pensionen.",
  Kinder: "Kindergeld, Elterngeld, Kinder- und Jugendhilfe einschließlich Kitas.",
  Ehegatten: "Leistungen wegen Ehe, v. a. Familienzuschläge für Beamte.",
  Mutterschaft: "Mutterschaftsgeld und Leistungen rund um die Geburt.",
  Arbeitslosigkeit: "Arbeitslosengeld, Kurzarbeitergeld und der Regelbedarf beim Bürgergeld.",
  Wohnen: "Wohngeld und die Kosten der Unterkunft beim Bürgergeld und in der Sozialhilfe.",
  "Allgemeine Lebenshilfen": "Hilfen, die keiner anderen Lebenslage zugeordnet sind – vor allem Leistungen nach dem Asylbewerberleistungsgesetz.",
  Verwaltungsausgaben: "Verwaltungskosten aller Systeme (Kassen, Rentenversicherung, Jobcenter …).",
  "Sonstige Ausgaben": "Übrige Ausgaben, die keine Leistung an Personen sind.",
};
const SHORT = { 61: "Kindergeld (Familienleistungsausgleich)", 63: "Bürgergeld (Grundsicherung für Arbeitsuchende)" };

const N = (id, label, value, extra) => Object.assign({ id, label, value }, extra || {});

function treeInst(D, year) {
  const j = D.years.indexOf(year);
  if (j < 0 || D.inst["0"][j] == null) return null;
  const kids = D.groups.map((g) => {
    const ch = g.children.filter((c) => D.inst[c][j] != null).map((c) => N(c, SHORT[c] || D.labels[c], D.inst[c][j], { desc: INST_DESC[c] }));
    const gv = D.inst[g.id][j];
    const diff = gv - ch.reduce((a, c) => a + c.value, 0);
    if (Math.abs(diff) > Math.max(5, gv * 0.002))
      ch.push(N(g.id + ":v", "Verrechnungen untereinander", diff, { desc: "Zahlungen zwischen den Versicherungen (z. B. Krankenversicherungsbeiträge, die die Rentenversicherung für Rentner zahlt) – sonst doppelt gezählt." }));
    return N(g.id, D.labels[g.id], gv, { desc: GROUP_DESC[g.id], children: ch.length > 1 ? ch : undefined });
  });
  const total = D.inst["0"][j];
  const diff = total - kids.reduce((a, c) => a + c.value, 0);
  if (Math.abs(diff) > 5) kids.push(N("0:v", "Verrechnungen zwischen den Systemen", diff, { desc: "Zahlungen eines Systems an ein anderes, die sonst doppelt gezählt würden." }));
  return { id: "root", label: "Sozialbudget", value: total, children: kids };
}

function treeFunc(D, year) {
  const j = D.years.indexOf(year);
  if (j < 0) return null;
  const m = D.matrix[year];
  const kids = Object.entries(D.func)
    .filter(([, arr]) => arr[j] != null)
    .map(([f, arr]) => {
      let ch;
      if (m) {
        ch = Object.entries(m)
          .filter(([c, row]) => c.length === 2 && row[f])
          .map(([c, row]) => N(f + ":" + c, SHORT[c] || D.labels[c] || c, row[f], { desc: INST_DESC[c] }));
        const diff = arr[j] - ch.reduce((a, c) => a + c.value, 0);
        if (ch.length && Math.abs(diff) > Math.max(5, arr[j] * 0.002)) ch.push(N(f + ":v", "Verrechnungen zwischen den Systemen", diff, { desc: "Abzug für Zahlungen zwischen den Systemen, die sonst doppelt gezählt würden – vor allem der Anteil an den Krankenversicherungsbeiträgen der Rentner, den die Rentenversicherung an die Krankenkassen zahlt." }));
      }
      return N(f, f, arr[j], { desc: FUNC_DESC[f], children: ch?.length > 1 ? ch : undefined });
    });
  const total = kids.reduce((a, c) => a + c.value, 0);
  return { id: "root", label: "Sozialbudget", value: total, children: kids };
}

export function render(root, { data, params, set }) {
  const D = data.sozial;
  const years = D.years;
  let year = +params.get("y") || years[years.length - 1];
  if (!years.includes(year)) year = years[years.length - 1];
  const j = years.indexOf(year);
  const unit = UNITS[params.get("u")] ? params.get("u") : "eur";
  const view = params.get("v") === "inst" ? "inst" : "func";
  const onYear = (y) => set({ y });
  const flag = (y) => (D.flags[y] === "p" ? " (vorläufig)" : D.flags[y] === "s" ? " (geschätzt)" : "");

  root.append(
    h(
      "header",
      { class: "view-head" },
      h("h1", {}, "Sozialstaat ", h("span", { class: "accent" }, year)),
      h(
        "p",
        { class: "lead" },
        "Alle Sozialleistungen in Deutschland laut Sozialbudget der Bundesregierung: wofür (Alter, Krankheit, Kinder …) und aus welchem System (Rentenversicherung, Pensionen, Bürgergeld …). ",
        "Das Sozialbudget ist breiter als der Staat – es zählt auch Lohnfortzahlung, Betriebsrenten und private Kranken­versicherung mit.",
      ),
    ),
    h("div", { class: "controls" }, field("Jahr", yearPicker(years, year, onYear)), field("Einheit", unitPicker(unit, (u) => set({ u })))),
  );

  // ----- KPIs
  const tot = D.inst["0"];
  const fv = (f, k = j) => D.func[f]?.[k] ?? null;
  const alter = fv("Alter") + fv("Hinterbliebene");
  root.append(
    h(
      "section",
      { class: "kpis" },
      kpi("Sozialbudget", fmt(conv(tot[j], year, unit), unit), "alle Sozialleistungen" + flag(year), change(tot[j], tot[j - 1])),
      kpi("Sozialleistungsquote", pct(conv(tot[j], year, "bip"), 1), "in % des BIP"),
      kpi("Je Einwohner", fmt(conv(tot[j], year, "kopf"), "kopf"), "pro Kopf und Jahr"),
      kpi("Alter und Hinterbliebene", fmt(conv(alter, year, unit), unit), pct((alter / tot[j]) * 100) + " des Sozialbudgets", change(alter, fv("Alter", j - 1) + fv("Hinterbliebene", j - 1))),
    ),
  );

  const matrixYears = Object.keys(D.matrix).map(Number);
  root.append(
    h(
      "section",
      { class: "card" },
      h(
        "div",
        { class: "card-head" },
        h("h2", {}, "Wohin fließen die Sozialleistungen?"),
        seg(
          [
            ["func", "nach Lebenslage"],
            ["inst", "nach System"],
          ],
          view,
          (v) => set({ v }),
          { label: "Gliederung" },
        ),
      ),
      h(
        "p",
        { class: "sub" },
        view === "func"
          ? `Gliederung nach Lebenslagen (Funktionen). Klick zeigt, aus welchen Systemen die Leistungen kommen – diese Aufteilung gibt es für ${matrixYears[0]}–${matrixYears[matrixYears.length - 1]}.`
          : "Gliederung nach Sicherungssystemen und einzelnen Programmen. Klick zeigt die Programme.",
      ),
      drill({
        key: `sozial-${view}`,
        rootLabel: "Sozialbudget",
        tree: (y) => (view === "func" ? treeFunc(D, y) : treeInst(D, y)),
        years,
        year,
        unit,
        onYear,
        note: (flag(year) ? `Werte für ${year}${flag(year)}. ` : "") + (view === "func" && !D.matrix[year] ? `Die Aufteilung nach Systemen liegt erst ab ${matrixYears[0]} vor.` : ""),
      }),
    ),
  );

  // ----- Quote over time
  const qEl = h("div", { class: "chart" });
  root.append(h("section", { class: "card" }, h("div", { class: "card-head" }, h("h2", {}, "Sozialleistungsquote")), h("p", { class: "sub" }, "Sozialbudget in % des Bruttoinlandsprodukts. Klick wählt das Jahr."), qEl));
  requestAnimationFrame(() => {
    const ys = years.filter((y) => conv(1, y, "bip") != null);
    timeChart(qEl, { years: ys, unit: "bip", year, onYear, series: [{ name: "Sozialleistungsquote", data: ys.map((y) => conv(tot[years.indexOf(y)], y, "bip")), color: theme().series[0], area: true }] });
  });
}
