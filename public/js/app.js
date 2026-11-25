// Kassensturz frontend: hash router, data loading, view dispatch.
import { h, setBase, disposeCharts, resetColorMemo } from "./lib.js";
import * as staat from "./views/staat.js";
import * as bund from "./views/bund.js";
import * as schulden from "./views/schulden.js";
import * as sozial from "./views/sozial.js";
import * as vermoegen from "./views/vermoegen.js";
import * as fakten from "./views/fakten.js";
import * as quellen from "./views/quellen.js";

const ROUTES = { staat, bund, sozial, schulden, vermoegen, fakten, quellen };
const main = document.getElementById("main");
let data = null;

function parseHash() {
  const raw = location.hash.replace(/^#\/?/, "");
  const [path, q] = raw.split("?");
  return { route: ROUTES[path] ? path : "staat", params: new URLSearchParams(q || "") };
}

function setParams(update) {
  const { route, params } = parseHash();
  for (const [k, v] of Object.entries(update)) {
    if (v == null) params.delete(k);
    else params.set(k, v);
  }
  const qs = params.toString();
  history.replaceState(null, "", `#/${route}${qs ? "?" + qs : ""}`);
  render();
}

function render() {
  if (!data) return;
  const { route, params } = parseHash();
  const scroll = window.scrollY;
  disposeCharts();
  main.replaceChildren();
  for (const a of document.querySelectorAll("[data-route]")) {
    const on = a.dataset.route === route;
    a.classList.toggle("on", on);
    if (on) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  }
  const view = ROUTES[route];
  document.title = (view.title ? view.title + " – " : "") + "Kassensturz";
  view.render(main, { data, params, set: setParams });
  window.scrollTo(0, scroll);
}

async function boot() {
  try {
    const [st, bu, so, ve, fl, fa] = await Promise.all(["data/staat.json", "data/bund.json", "data/sozial.json", "data/vermoegen.json", "data/flucht.json", "data/fakten.json"].map((u) => fetch(u).then((r) => (r.ok ? r.json() : Promise.reject(new Error(u))))));
    data = { staat: st, bund: bu, sozial: so, vermoegen: ve, flucht: fl, fakten: fa };
    setBase(st);
    render();
  } catch (e) {
    main.replaceChildren(h("p", { class: "empty" }, "Die Daten konnten nicht geladen werden. Bitte Seite neu laden."));
    console.error(e);
  }
}

let lastRoute = parseHash().route;
window.addEventListener("hashchange", () => {
  const r = parseHash().route;
  render();
  if (r !== lastRoute) window.scrollTo(0, 0);
  lastRoute = r;
});
const mq = window.matchMedia("(prefers-color-scheme: dark)");
mq.addEventListener("change", () => {
  resetColorMemo();
  render();
});
boot();
