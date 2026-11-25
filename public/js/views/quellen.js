// View "Quellen": where every number comes from.
import { h } from "../lib.js";

export const title = "Quellen";

export function render(root, { data }) {
  const s = data.staat.source;
  const b = data.bund.source;
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
  );
}
