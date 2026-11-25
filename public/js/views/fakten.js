// View "Fakten": hand-curated single facts and curiosities (data/fakten.json), each with its own
// sources. Every amount is put into perspective with the Bundeshaushalt and the population.
import { h, nf, conv, seg, field } from "../lib.js";

export const title = "Fakten & Kuriositäten";

/** Mio. EUR -> readable German text ("2,5 Mrd. €", "243 Mio. €"). */
export function money(mio) {
  if (mio == null) return "–";
  const a = Math.abs(mio);
  if (a >= 1e6) return nf(mio / 1e6, a >= 1e7 ? 0 : 2) + " Bio. €";
  if (a >= 1000) return nf(mio / 1000, a >= 1e5 ? 0 : a >= 1e4 ? 1 : 2) + " Mrd. €";
  if (a >= 1) return nf(mio, a >= 100 ? 0 : 1) + " Mio. €";
  return nf(mio * 1e6, 0) + " €";
}

/** Duration the Bund needs to spend this amount, from its planned total for the year. */
function bundTime(mio, total) {
  const days = (mio / total) * 365;
  if (days >= 2) return nf(days, days >= 20 ? 0 : 1) + " Tage";
  const hours = days * 24;
  if (hours >= 1) return nf(hours, hours >= 10 ? 0 : 1) + " Stunden";
  return nf(hours * 60, 0) + " Minuten";
}

function perspective(f, data) {
  if (f.value == null || f.compare === false) return null;
  const years = Object.keys(data.bund.years).map(Number);
  const y = Math.min(Math.max(f.year || years.at(-1), years[0]), years.at(-1));
  const total = data.bund.years[y]?.soll?.ausgaben?.single?.total;
  const kopf = conv(f.value, Math.min(y, data.staat.years.at(-1)), "kopf");
  const parts = [];
  if (kopf != null) parts.push(h("li", {}, h("b", {}, nf(kopf, kopf >= 10 ? 0 : 2) + " €"), " je Einwohner"));
  if (total) {
    const share = (f.value / total) * 100;
    parts.push(h("li", {}, h("b", {}, nf(share, share >= 10 ? 0 : share >= 0.1 ? 1 : 3) + " %"), ` der Bundesausgaben ${y}`));
    parts.push(h("li", {}, "so viel gibt der Bund in ", h("b", {}, bundTime(f.value, total)), " aus"));
  }
  return parts.length ? h("ul", { class: "persp", "aria-label": "Zum Vergleich" }, parts) : null;
}

function bars(f) {
  if (!f.bars?.length) return null;
  const max = Math.max(...f.bars.map((b) => Math.abs(b.v)));
  return h(
    "ul",
    { class: "cmplist" },
    f.bars.map((b) =>
      h(
        "li",
        {},
        h("span", { class: "name" }, b.label, b.note ? h("span", { class: "muted" }, " – " + b.note) : null),
        h("span", { class: "val" }, b.text || money(b.v)),
        h("span", { class: "bar" }, h("i", { class: b.tone ? "t-" + b.tone : null, style: { width: Math.max(0.5, (Math.abs(b.v) / max) * 100) + "%" } })),
      ),
    ),
  );
}

function card(f, data, cats) {
  return h(
    "article",
    { class: "card fact", id: "f-" + f.id },
    h("div", { class: "fact-cat" }, cats[f.cat] || f.cat),
    h("h2", {}, f.title),
    h("div", { class: "fact-value" }, f.valueText || money(f.value), f.valueNote ? h("span", {}, " " + f.valueNote) : null),
    h("p", {}, f.lead),
    bars(f),
    f.points?.length ? h("ul", { class: "fact-points" }, f.points.map((p) => h("li", {}, p))) : null,
    perspective(f, data),
    h(
      "details",
      { class: "fact-src" },
      h("summary", {}, `Quellen (${f.sources.length})`),
      h(
        "ul",
        {},
        f.sources.map((s) => h("li", {}, h("a", { href: s.url, rel: "noopener" }, s.name), s.date ? h("span", { class: "muted" }, ", " + s.date) : null, s.note ? h("div", { class: "muted" }, s.note) : null)),
      ),
    ),
  );
}

export function render(root, { data, params, set }) {
  const F = data.fakten;
  const cats = F.categories;
  const cat = cats[params.get("k")] ? params.get("k") : "alle";
  root.append(
    h(
      "header",
      { class: "view-head" },
      h("h1", {}, "Fakten & Kuriositäten"),
      h(
        "p",
        { class: "lead" },
        "Einzelne Posten, über die viel geredet wird – was sie wirklich gekostet haben, mit Quelle. Zur Einordnung steht bei jedem Betrag, wie viel das je Einwohner ist und wie lange der Bund braucht, um so viel auszugeben.",
      ),
    ),
    h("div", { class: "controls" }, field("Thema", seg([["alle", "Alle"], ...Object.entries(cats)], cat, (k) => set({ k: k === "alle" ? null : k }), { label: "Thema" }))),
  );
  const list = F.facts.filter((f) => cat === "alle" || f.cat === cat);
  root.append(h("div", { class: "facts" }, list.map((f) => card(f, data, cats))));
  root.append(
    h(
      "p",
      { class: "note" },
      `Stand der Recherche: ${F.updated}. Die Beträge sind von Hand aus amtlichen Dokumenten (Bundestagsdrucksachen, Ministerien, Rechnungshöfe, Statistisches Bundesamt) übernommen; wo nur Presseberichte vorliegen, steht das dabei. „Je Einwohner“ und „Anteil an den Bundesausgaben“ beziehen sich auf das angegebene Jahr (Bundesausgaben laut Haushaltsplan).`,
    ),
  );
}
