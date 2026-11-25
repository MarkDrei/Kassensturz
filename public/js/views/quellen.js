// View "Quellen": where every number comes from.
import { h } from "../lib.js";

export const title = "Quellen";

export function render(root, { data }) {
  const s = data.staat.source;
  const b = data.bund.source;
  const so = data.sozial.source;
  const v = data.vermoegen.source;
  const f = data.flucht.source;
  const a = (href, text) => h("a", { href, rel: "noopener" }, text);
  root.append(
    h("header", { class: "view-head" }, h("h1", {}, "Quellen und Methodik"), h("p", { class: "lead" }, "Alle Zahlen stammen aus amtlichen Quellen und werden regelmäßig neu abgerufen.")),
    h(
      "section",
      { class: "card prose" },
      h("h2", {}, "Gesamtstaat, Ebenen, Schulden, BIP"),
      h("p", {}, s.name, ". Abgerufen am ", s.retrieved, " über die ", h("a", { href: s.url, rel: "noopener" }, "Eurostat-Datenbank"), "."),
      h(
        "table",
        {},
        h("thead", {}, h("tr", {}, h("th", {}, "Datensatz"), h("th", {}, "Inhalt"), h("th", {}, "Stand"))),
        h(
          "tbody",
          {},
          Object.entries(s.datasets).map(([id, d]) =>
            h(
              "tr",
              {},
              h("td", {}, h("a", { href: `https://ec.europa.eu/eurostat/databrowser/view/${id}/default/table`, rel: "noopener" }, h("code", {}, id))),
              h("td", {}, d.label, d.note ? h("div", { class: "muted" }, d.note) : null),
              h("td", {}, (d.updated || "").slice(0, 10)),
            ),
          ),
        ),
      ),
      h(
        "ul",
        {},
        h("li", {}, "Abgrenzung nach dem Europäischen System Volkswirtschaftlicher Gesamtrechnungen (ESVG 2010). Das ist die Basis der Maastricht-Kriterien und weicht von den Haushaltsplänen ab."),
        h("li", {}, "„Staat gesamt“ ist konsolidiert: Zahlungen zwischen Bund, Ländern, Gemeinden und Sozialversicherung sind herausgerechnet. Die einzelnen Ebenen enthalten diese Zahlungen, ihre Summe ist daher größer."),
        h("li", {}, "Bund = Zentralstaat einschließlich Extrahaushalten und Sondervermögen."),
        h("li", {}, "„Inflationsbereinigt“ rechnet mit dem BIP-Deflator auf Preise des letzten verfügbaren Jahres um. „€ je Einwohner“ nutzt die Bevölkerung im Jahresdurchschnitt."),
      ),
    ),
    h(
      "section",
      { class: "card prose" },
      h("h2", {}, "Bundeshaushalt"),
      h("p", {}, b.name, ", ", h("a", { href: b.url, rel: "noopener" }, "bundeshaushalt.de"), ". Abgerufen am ", b.retrieved, "."),
      h(
        "ul",
        {},
        h("li", {}, b.note, "."),
        h("li", {}, "Nur der Kernhaushalt. Sondervermögen (z. B. für die Bundeswehr oder Infrastruktur) sind nur mit den Zuführungen aus dem Kernhaushalt enthalten."),
        h("li", {}, "Gliederungen: Einzelpläne und Kapitel, Funktionenplan (Haupt- und Oberfunktionen) und Gruppierungsplan (Haupt- und Obergruppen)."),
      ),
    ),
    h(
      "section",
      { class: "card prose" },
      h("h2", {}, "Sozialstaat"),
      h("p", {}, so.name, " ", so.edition, ", ", a(so.page, "Veröffentlichung beim BMAS"), ". Abgerufen am ", so.retrieved, "."),
      h(
        "ul",
        {},
        h("li", {}, "Leistungen nach Systemen: ", a(Object.values(so.tables)[0], "Tabelle II"), "; nach Lebenslagen (Funktionen): ", a(Object.values(so.tables)[1], "Tabelle I-2"), "."),
        h("li", {}, "Lebenslage × System (Tabelle III-2) für ", Object.keys(so.matrix).join(", "), " – je Jahr aus der neuesten Ausgabe, die das Jahr enthält."),
        h("li", {}, so.note),
        h("li", {}, "Das Sozialbudget ist mit der EU-Sozialschutzstatistik (ESSPROS) abgestimmt, aber nicht mit der Staatsfinanzstatistik der Ansicht „Gesamtstaat“: Es enthält auch Arbeitgeber- und private Systeme und gliedert anders."),
      ),
    ),
    h(
      "section",
      { class: "card prose" },
      h("h2", {}, "Flucht und Asyl"),
      h(
        "ul",
        {},
        h("li", {}, f.bund.name, ". ", f.bund.note, " Quelle je Jahr: ", Object.entries(f.bund.perYear).map(([y, s], i) => [i ? ", " : "", a(s.url, y)]), "."),
        h("li", {}, f.sgb2.name, ". ", f.sgb2.note, " Quelle je Jahr: ", Object.entries(f.sgb2.perYear).map(([y, s], i) => [i ? ", " : "", a(s.url, y)]), "."),
        h("li", {}, f.asylblg.name, ": ", a(f.asylblg.urls[0], "Ausgaben"), ", ", a(f.asylblg.urls[1], "Empfänger"), ". Abgerufen am ", f.asylblg.retrieved, "."),
        h("li", {}, f.schutzsuchende.name, ": ", a(f.schutzsuchende.url, "Zeitreihe"), ". Abgerufen am ", f.schutzsuchende.retrieved, "."),
      ),
    ),
    h(
      "section",
      { class: "card prose" },
      h("h2", {}, "Vermögen und Erbschaften"),
      h(
        "ul",
        {},
        h("li", {}, v.bilanz.name, ": ", a(v.bilanz.url, "Excel-Datei"), " (", a(v.bilanz.page, "Übersicht"), "). Abgerufen am ", v.bilanz.retrieved, "."),
        h("li", {}, v.verteilung.name, ": ", a("https://data.ecb.europa.eu/data/datasets/DWA", "EZB-Datenportal"), ". ", v.verteilung.note, ". Abgerufen am ", v.verteilung.retrieved, "."),
        h("li", {}, v.erbschaft.name, ": ", a(v.erbschaft.url, "Statistischer Bericht"), " (", a(v.erbschaft.page, "Übersicht"), "). ", v.erbschaft.unit, ". Abgerufen am ", v.erbschaft.retrieved, "."),
        h("li", {}, "Schätzung des gesamten Erbvolumens (nur als Einordnung, keine amtliche Zahl): ", a("https://www.diw.de/de/diw_01.c.560993.de/in_deutschland_werden_zwischen_2012_und_2027_bis_zu_400_milliarden_euro_pro_jahr_verschenkt_und_vererbt_werden_gut_ein_viertel_mehr_als_bisher_angenommen.html", "DIW Wochenbericht 27/2017"), "."),
      ),
    ),
    h(
      "section",
      { class: "card prose" },
      h("h2", {}, "Fakten & Kuriositäten"),
      h(
        "p",
        {},
        "Einzelwerte, von Hand aus amtlichen Dokumenten übernommen (Stand ",
        data.fakten.updated,
        "). Jede Karte nennt ihre Quellen direkt; wo nur Presseberichte oder Verbände Zahlen liefern, ist das dort vermerkt. Die Einordnung „je Einwohner“ und „Anteil an den Bundesausgaben“ nutzt die Bevölkerung (Eurostat) und den Haushaltsplan des Bundes im jeweiligen Jahr.",
      ),
    ),
  );
}
