// View "Sozialstaat": the BMAS Sozialbudget – social benefits by programme and by life situation (function).
import { h, conv, fmt, pct, nf, kpi, change, seg, yearPicker, unitPicker, field, drill, timeChart, theme, UNITS } from "../lib.js";

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

  renderFlucht(root, data, year, unit, onYear);

  // ----- Quote over time
  const qEl = h("div", { class: "chart" });
  root.append(h("section", { class: "card" }, h("div", { class: "card-head" }, h("h2", {}, "Sozialleistungsquote")), h("p", { class: "sub" }, "Sozialbudget in % des Bruttoinlandsprodukts. Klick wählt das Jahr."), qEl));
  requestAnimationFrame(() => {
    const ys = years.filter((y) => conv(1, y, "bip") != null);
    timeChart(qEl, { years: ys, unit: "bip", year, onYear, series: [{ name: "Sozialleistungsquote", data: ys.map((y) => conv(tot[years.indexOf(y)], y, "bip")), color: theme().series[0], area: true }] });
  });
}

/** Section "Flucht und Asyl": official cost figures and their size relative to the whole. */
function renderFlucht(root, data, year, unit, onYear) {
  const F = data.flucht;
  const D = data.sozial;
  const B = data.bund;
  const t = theme();
  const last = (arr) => arr[arr.length - 1];
  const fb = F.bund,
    fs = F.sgb2,
    fa = F.asylblg,
    fz = F.schutzsuchende;
  // reference year: the selected year if every series has it, otherwise the latest common year
  const common = fb.years.filter((y) => fs.years.includes(y) && fa.years.includes(y) && fz.years.includes(y));
  const ry = common.includes(year) ? year : last(common);
  const at = (o, key, y) => o[key][o.years.indexOf(y)];
  const bundTot = at(fb, "total", ry);
  const bundAbroad = fb.components[0].values[fb.years.indexOf(ry)];
  const asylNet = fa.netto[fa.years.indexOf(ry)];
  const si = fs.years.indexOf(ry);
  const sgbRef = fs.values.asyl8[si] + fs.values.ukraine[si];
  const sozTot = D.inst["0"][D.years.indexOf(ry)];
  const bundAusg = B.years[ry]?.ist?.ausgaben.single.total ?? B.years[ry]?.soll?.ausgaben.single.total;
  const schutz = fz.total[fz.years.indexOf(ry)];
  const popI = data.staat.years.indexOf(ry);
  const pop = data.staat.population[popI] * 1000;
  const M = (v) => fmt(conv(v, ry, unit), unit);

  const cmp = [
    { label: "Sozialbudget insgesamt", v: sozTot, note: "alle Sozialleistungen" },
    { label: "Gesetzliche Rentenversicherung", v: D.inst["11"][D.years.indexOf(ry)] },
    { label: "Bürgergeld insgesamt (Zahlungsansprüche)", v: fs.total[si] },
    { label: "Flüchtlingsbezogene Ausgaben des Bundes", v: bundTot, note: `davon ${M(bundAbroad)} Fluchtursachenbekämpfung im Ausland` },
    { label: "Bürgergeld für Menschen aus Asylherkunftsländern und der Ukraine", v: sgbRef, note: "überschneidet sich mit der Bundeszeile" },
    { label: "Asylbewerberleistungen (netto)", v: asylNet, note: "Länder und Kommunen" },
  ];
  const max = Math.max(...cmp.map((c) => c.v));

  const bundEl = h("div", { class: "chart" });
  const sgbEl = h("div", { class: "chart" });
  const asylEl = h("div", { class: "chart" });
  const schutzEl = h("div", { class: "chart" });
  root.append(
    h(
      "section",
      { class: "card", id: "flucht" },
      h("div", { class: "card-head" }, h("h2", {}, "Flucht und Asyl: Was kostet das?")),
      h(
        "p",
        { class: "sub" },
        "Die amtlichen Zahlen dazu, eingeordnet in das Ganze. Es gibt keine einzelne Gesamtzahl: Bund, Länder und Kommunen tragen Kosten, und die Statistiken überschneiden sich teilweise – sie dürfen nicht einfach addiert werden.",
      ),
      h(
        "div",
        { class: "kpis" },
        kpi("Flüchtlingsbezogene Ausgaben des Bundes", M(bundTot), `${ry}, ${bundAusg ? pct((bundTot / bundAusg) * 100) + " des Bundeshaushalts; " : ""}davon ${M(bundAbroad)} im Ausland`),
        kpi("Asylbewerberleistungen", M(asylNet), `${ry}, netto · ${pct((asylNet / sozTot) * 100, 2)} des Sozialbudgets`),
        kpi("Bürgergeld: Asylherkunftsländer + Ukraine", M(sgbRef), `${ry}, ${pct((sgbRef / fs.total[si]) * 100)} aller Bürgergeld-Zahlungsansprüche`),
        kpi("Schutzsuchende in Deutschland", nf(schutz / 1e6, 2) + " Mio.", `Ende ${ry}, ${pct((schutz / pop) * 100)} der Bevölkerung`),
      ),
      h("h3", { class: "chart-title" }, `Größenordnungen ${ry} im Vergleich`),
      h(
        "ol",
        { class: "cmplist" },
        cmp.map((c) =>
          h(
            "li",
            {},
            h("span", { class: "name" }, c.label, c.note ? h("span", { class: "muted" }, " – " + c.note) : null),
            h("span", { class: "val" }, M(c.v)),
            h("span", { class: "bar" }, h("i", { style: { width: Math.max(0.3, (c.v / max) * 100) + "%" } })),
          ),
        ),
      ),
      h("h3", { class: "chart-title" }, "Flüchtlingsbezogene Ausgaben des Bundes"),
      h("p", { class: "note" }, "Ist-Werte laut Bundesfinanzministerium (Finanzpläne bzw. Antwort der Bundesregierung). Gestrichelt: Planung " + fb.plan.note + ". Laut BMF lässt sich nicht in jedem Einzelfall genau abgrenzen, ob eine Leistung ausschließlich flüchtlingsbezogen ist."),
      bundEl,
      h("h3", { class: "chart-title" }, "Bürgergeld nach Staatsangehörigkeit"),
      h(
        "p",
        { class: "note" },
        "Jahressumme der Zahlungsansprüche (Regelbedarf, Unterkunftskosten u. a., ohne Verwaltung) laut Statistik der Bundesagentur für Arbeit. Asylherkunftsländer (Top 8): Afghanistan, Eritrea, Irak, Iran, Nigeria, Pakistan, Somalia, Syrien. Erfasst ist die Staatsangehörigkeit, nicht der Fluchtstatus. Ukrainische Geflüchtete erhalten seit Juni 2022 Bürgergeld statt Asylbewerberleistungen.",
      ),
      sgbEl,
      h("div", { class: "grid2" }, h("div", {}, h("h3", { class: "chart-title" }, "Asylbewerberleistungen (netto)"), asylEl), h("div", {}, h("h3", { class: "chart-title" }, "Schutzsuchende nach Status (Tsd. Personen)"), schutzEl)),
      h(
        "p",
        { class: "note" },
        "Asylbewerberleistungen erhalten Asylsuchende während des Verfahrens sowie Geduldete; nach der Anerkennung wechseln sie in der Regel ins Bürgergeld (oder bei Erwerbsunfähigkeit in die Sozialhilfe). Kosten von Ländern und Kommunen über diese Leistungen hinaus (z. B. Unterbringung, Schulen, Kitas) werden nicht einheitlich erfasst; eine amtliche Gesamtzahl gibt es nicht.",
      ),
    ),
  );

  requestAnimationFrame(() => {
    const allYears = [...fb.years, ...fb.plan.years];
    const pad = (arr) => [...arr, ...fb.plan.years.map(() => null)];
    timeChart(bundEl, {
      years: allYears,
      unit,
      year: ry,
      onYear,
      series: [
        ...fb.components.map((c, k) => ({ name: c.label, type: "bar", stack: "b", data: pad(fb.years.map((y, i) => conv(c.values[i], y, unit))), color: t.series[[6, 3, 2, 0, 4][k]] })),
        { name: "Planung (gesamt)", data: [...fb.years.map((y, i) => (i === fb.years.length - 1 ? conv(fb.total[i], y, unit) : null)), ...fb.plan.years.map((y, i) => conv(fb.plan.total[i], y, unit))], color: t.ink2 || t.muted, dashed: true },
      ],
    });
    timeChart(sgbEl, {
      years: fs.years,
      unit,
      year: ry,
      onYear,
      total: true,
      series: fs.groups.map((g, k) => ({ name: g.label, type: "bar", stack: "s", data: fs.years.map((y, i) => conv(fs.values[g.id][i], y, unit)), color: [t.series[0], t.series[3], t.series[1], t.other][k] })),
    });
    timeChart(asylEl, { years: fa.years, unit, year: ry, onYear, series: [{ name: "Nettoausgaben", type: "bar", data: fa.years.map((y, i) => conv(fa.netto[i], y, unit)), color: t.series[1] }] });
    timeChart(schutzEl, {
      years: fz.years,
      unit: "n",
      year: ry,
      onYear,
      total: true,
      valueFmt: (v) => nf(v) + " Tsd.",
      series: [
        { name: "anerkannt", type: "bar", stack: "z", data: fz.anerkannt.map((v) => v / 1000), color: t.series[2] },
        { name: "Verfahren offen", type: "bar", stack: "z", data: fz.offen.map((v) => v / 1000), color: t.series[3] },
        { name: "abgelehnt", type: "bar", stack: "z", data: fz.abgelehnt.map((v) => (v == null ? null : v / 1000)), color: t.series[1] },
      ],
    });
  });
}
