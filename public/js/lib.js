// Shared building blocks: DOM helper, number formatting, unit conversion, chart wrappers and the
// drill-down component (donut + ranked list + trend chart) used by all finance views.
/* global echarts */

// ---------- DOM ----------
export function h(tag, attrs, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "class") el.className = v;
    else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
    else if (k === "html") el.innerHTML = v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

// ---------- numbers ----------
const nfCache = {};
export function nf(v, d = 0) {
  const f = (nfCache[d] ||= new Intl.NumberFormat("de-DE", { minimumFractionDigits: d, maximumFractionDigits: d }));
  return f.format(v).replace("-", "\u2212");
}
export const pct = (v, d = 1) => (v == null || !isFinite(v) ? "–" : nf(v, d) + " %");

export const UNITS = {
  eur: { label: "Mrd. € (nominal)", short: "Mrd. €" },
  real: { label: "Mrd. € (inflationsbereinigt)", short: "Mrd. € real" },
  bip: { label: "% des BIP", short: "% BIP" },
  kopf: { label: "€ je Einwohner", short: "€ je Einw." },
};

let BASE = null;
/** Reference series (GDP, population, deflator) from staat.json, needed for unit conversion. */
export function setBase(staat) {
  let last = staat.deflator.length - 1;
  while (last > 0 && staat.deflator[last] == null) last--;
  BASE = { years: staat.years, gdp: staat.gdp, pop: staat.population, defl: staat.deflator, deflIdx: last };
  UNITS.real.label = `Mrd. € (inflationsbereinigt, Preise ${staat.years[last]})`;
}

/** Convert a value in Mio. EUR for a given year into the display unit. null if not available. */
export function conv(mio, year, unit) {
  if (mio == null || !isFinite(mio)) return null;
  const i = BASE.years.indexOf(+year);
  switch (unit) {
    case "real":
      return i < 0 || !BASE.defl[i] ? null : ((mio / 1000) * BASE.defl[BASE.deflIdx]) / BASE.defl[i];
    case "bip":
      return i < 0 || !BASE.gdp[i] ? null : (mio / BASE.gdp[i]) * 100;
    case "kopf":
      return i < 0 || !BASE.pop[i] ? null : (mio * 1000) / BASE.pop[i];
    default:
      return mio / 1000;
  }
}

export function fmt(v, unit, sign = false) {
  if (v == null || !isFinite(v)) return "–";
  const a = Math.abs(v);
  let s;
  if (unit === "bip") s = nf(v, a < 1 ? 2 : 1) + " %";
  else if (unit === "kopf") s = nf(v, 0) + " €";
  else s = nf(v, a >= 100 ? 0 : a >= 10 ? 1 : 2) + " Mrd. €";
  return (sign && v > 0 ? "+" : "") + s;
}
/** Short axis tick label. */
export function fmtAxis(v, unit) {
  if (unit === "bip") return nf(v, Math.abs(v) < 10 && v % 1 ? 1 : 0) + " %";
  if (unit === "kopf") return nf(v, 0) + " €";
  return nf(v, 0);
}

/** Split "11 Bundesministerium für …" into code and name. */
export function splitLabel(label) {
  const m = /^(\d+)\s+(.*)$/.exec(label || "");
  return m ? { code: m[1], name: m[2] } : { code: "", name: label || "" };
}

// ---------- theme ----------
export function theme() {
  const cs = getComputedStyle(document.documentElement);
  const v = (n) => cs.getPropertyValue(n).trim();
  return {
    series: [1, 2, 3, 4, 5, 6, 7].map((i) => v(`--series-${i}`)),
    other: v("--series-other"),
    ink: v("--text-primary"),
    ink2: v("--text-secondary"),
    muted: v("--text-muted"),
    grid: v("--grid"),
    axis: v("--axis"),
    surface: v("--surface-1"),
    border: v("--border-solid"),
    pos: v("--pos"),
    neg: v("--neg"),
  };
}

// ---------- charts ----------
const live = new Set();
export function disposeCharts() {
  for (const { chart, ro } of live) {
    ro.disconnect();
    chart.dispose();
  }
  live.clear();
}
function makeChart(el) {
  const chart = echarts.init(el, null, { renderer: "svg", locale: "EN" });
  const ro = new ResizeObserver(() => chart.resize());
  ro.observe(el);
  live.add({ chart, ro });
  return chart;
}

function tooltipBase(t) {
  return {
    backgroundColor: t.surface,
    borderColor: t.border,
    borderWidth: 1,
    padding: [8, 10],
    textStyle: { color: t.ink, fontSize: 12, fontFamily: "inherit" },
    extraCssText: "box-shadow:0 4px 16px rgba(0,0,0,.12);border-radius:8px;",
    confine: true,
  };
}
const dot = (c) => `<span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${c};margin-right:6px"></span>`;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/**
 * Time-series chart (lines, areas, bars) on one y-axis.
 * series: [{name, data[], color, type:'line'|'bar', area, stack, width, signColors}]
 * opts: {years, unit, year (highlighted), onYear(y), refLines:[{y,label}], total (show sum in tooltip)}
 */
export function timeChart(el, { years, series, unit, year, onYear, refLines = [], total = false, valueFmt }) {
  const t = theme();
  const chart = makeChart(el);
  const vf = valueFmt || ((v) => fmt(v, unit));
  const hasBar = series.some((s) => s.type === "bar");
  const cats = years.map(String);
  const out = series.map((s, i) => {
    const base = {
      name: s.name,
      type: s.type || "line",
      stack: s.stack,
      data: s.signColors
        ? s.data.map((v) => ({ value: v, itemStyle: { color: v < 0 ? t.neg : t.pos } }))
        : s.data,
      color: s.color,
      emphasis: { focus: "none" },
    };
    if (base.type === "line") {
      Object.assign(base, {
        showSymbol: false,
        symbolSize: 8,
        smooth: false,
        connectNulls: false,
        lineStyle: { width: s.width || 2, color: s.color, type: s.dashed ? "dotted" : "solid" },
        areaStyle: s.area ? { opacity: s.stack ? 0.85 : 0.12, color: s.color } : undefined,
      });
      if (s.area && s.stack) base.lineStyle = { width: 1, color: t.surface };
    } else {
      Object.assign(base, {
        barMaxWidth: 18,
        itemStyle: { borderRadius: s.stack ? 0 : [3, 3, 0, 0], color: s.signColors ? undefined : s.color },
      });
    }
    if (i === 0) {
      const lines = [];
      if (year != null && cats.includes(String(year)))
        lines.push({ xAxis: String(year), lineStyle: { color: t.ink2, width: 1, type: "solid" }, label: { show: false } });
      for (const r of refLines)
        lines.push({
          yAxis: r.y,
          lineStyle: { color: t.ink2, width: 1, type: "dashed" },
          label: { show: true, position: "insideEndTop", formatter: r.label, color: t.ink2, fontSize: 11 },
        });
      if (lines.length) base.markLine = { silent: true, symbol: "none", data: lines, animation: false };
    }
    return base;
  });
  chart.setOption({
    animationDuration: 250,
    textStyle: { fontFamily: "inherit" },
    grid: { left: 4, right: 22, top: 14, bottom: 4, containLabel: true },
    // ECharts legend stays hidden; an HTML legend (wraps, never truncates) drives it.
    legend: series.length > 1 ? { show: false } : undefined,
    tooltip: {
      ...tooltipBase(t),
      trigger: "axis",
      axisPointer: { type: hasBar ? "shadow" : "line", lineStyle: { color: t.axis }, shadowStyle: { color: "rgba(127,127,127,.08)" } },
      formatter: (ps) => {
        if (!ps.length) return "";
        let sum = 0;
        const rows = ps
          .filter((p) => p.value != null && (typeof p.value !== "object" || p.value.value != null))
          .map((p) => {
            const v = typeof p.value === "object" ? p.value.value : p.value;
            sum += v || 0;
            return `<div style="display:flex;justify-content:space-between;gap:16px"><span>${dot(p.color)}${esc(p.seriesName)}</span><b>${vf(v)}</b></div>`;
          });
        if (total && rows.length > 1)
          rows.push(`<div style="display:flex;justify-content:space-between;gap:16px;border-top:1px solid ${t.grid};margin-top:4px;padding-top:4px"><span>Summe</span><b>${vf(sum)}</b></div>`);
        return `<div style="font-weight:600;margin-bottom:4px">${ps[0].axisValue}</div>${rows.join("") || "keine Daten"}`;
      },
    },
    xAxis: {
      type: "category",
      data: cats,
      boundaryGap: hasBar,
      axisLine: { lineStyle: { color: t.axis } },
      axisTick: { show: false },
      axisLabel: { color: t.muted, fontSize: 11, hideOverlap: true },
    },
    yAxis: {
      type: "value",
      splitLine: { lineStyle: { color: t.grid } },
      axisLabel: { color: t.muted, fontSize: 11, formatter: (v) => fmtAxis(v, unit) },
    },
    series: out,
  });
  if (series.length > 1) {
    el.previousElementSibling?.classList.contains("legend") && el.previousElementSibling.remove();
    el.before(
      h(
        "div",
        { class: "legend" },
        series.map((s) =>
          h(
            "button",
            {
              type: "button",
              "aria-pressed": "true",
              title: "Ein-/ausblenden",
              onclick: (e) => {
                const b = e.currentTarget;
                b.setAttribute("aria-pressed", String(b.getAttribute("aria-pressed") !== "true"));
                chart.dispatchAction({ type: "legendToggleSelect", name: s.name });
              },
            },
            h("span", { class: "sw", style: { background: s.signColors ? t.pos : s.color } }),
            s.name,
          ),
        ),
      ),
    );
  }
  if (onYear) {
    el.style.cursor = "pointer";
    chart.getZr().on("click", (e) => {
      const p = [e.offsetX, e.offsetY];
      if (!chart.containPixel("grid", p)) return;
      const idx = Math.round(chart.convertFromPixel({ xAxisIndex: 0 }, p[0]));
      if (years[idx] != null) onYear(years[idx]);
    });
  }
  return chart;
}

/** Donut chart. items: [{id, label, value, color}] (positive values only). */
export function donut(el, { items, centerTop, centerBottom, unit, year, onClick }) {
  const t = theme();
  const chart = makeChart(el);
  const sum = items.reduce((a, b) => a + b.value, 0);
  chart.setOption({
    animationDuration: 300,
    textStyle: { fontFamily: "inherit" },
    graphic: [
      {
        type: "group",
        left: "center",
        top: "middle",
        silent: true,
        children: [
          { type: "text", style: { text: centerTop, x: 0, y: 0, align: "center", verticalAlign: "bottom", fill: t.ink, fontSize: 20, fontWeight: 600, fontFamily: "system-ui, sans-serif" } },
          { type: "text", style: { text: centerBottom, x: 0, y: 6, align: "center", verticalAlign: "top", fill: t.ink2, fontSize: 12, fontFamily: "system-ui, sans-serif" } },
        ],
      },
    ],
    tooltip: {
      ...tooltipBase(t),
      trigger: "item",
      formatter: (p) =>
        `${dot(p.color)}<b>${esc(p.name)}</b><br>${fmt(conv(p.value, year, unit), unit)} · ${pct((p.value / sum) * 100)}` +
        (p.data.hint ? `<br><span style="color:${t.ink2}">${esc(p.data.hint)}</span>` : ""),
    },
    series: [
      {
        type: "pie",
        radius: ["56%", "86%"],
        center: ["50%", "50%"],
        startAngle: 90,
        padAngle: 0.6,
        avoidLabelOverlap: true,
        label: { show: false },
        labelLine: { show: false },
        itemStyle: { borderRadius: 4, borderColor: t.surface, borderWidth: 1 },
        emphasis: { scale: true, scaleSize: 5 },
        data: items.map((i) => ({ name: i.label, value: i.value, id: i.id, hint: i.hint, itemStyle: { color: i.color }, cursor: i.clickable ? "pointer" : "default" })),
      },
    ],
  });
  if (onClick) chart.on("click", (p) => onClick(p.data.id));
  return chart;
}

// ---------- small UI pieces ----------
export function seg(options, value, onChange, { label } = {}) {
  return h(
    "div",
    { class: "seg", role: "group", "aria-label": label },
    options.map(([v, text, disabled]) =>
      h("button", { type: "button", class: v === value ? "on" : null, "aria-pressed": String(v === value), disabled: !!disabled, onclick: () => v !== value && onChange(v) }, text),
    ),
  );
}

export function yearPicker(years, year, onChange) {
  const i = years.indexOf(year);
  return h(
    "div",
    { class: "yearpick" },
    h("button", { type: "button", class: "icon", "aria-label": "Vorheriges Jahr", disabled: i <= 0, onclick: () => onChange(years[i - 1]) }, "‹"),
    h(
      "select",
      { "aria-label": "Jahr", onchange: (e) => onChange(+e.target.value) },
      years.map((y) => h("option", { value: y, selected: y === year }, y)),
    ),
    h("button", { type: "button", class: "icon", "aria-label": "Nächstes Jahr", disabled: i >= years.length - 1, onclick: () => onChange(years[i + 1]) }, "›"),
  );
}

export function unitPicker(unit, onChange) {
  return h(
    "select",
    { class: "unitpick", "aria-label": "Einheit", onchange: (e) => onChange(e.target.value) },
    Object.entries(UNITS).map(([k, u]) => h("option", { value: k, selected: k === unit }, u.label)),
  );
}

export function field(label, control) {
  return h("label", { class: "field" }, h("span", {}, label), control);
}

/** KPI tile. delta: relative change in % vs previous year (nominal). */
export function kpi(label, value, sub, delta, { invert = false } = {}) {
  let d = null;
  if (delta != null && isFinite(delta)) {
    const up = delta >= 0;
    d = h("span", { class: "delta" }, (up ? "▲ +" : "▼ ") + nf(delta, 1) + " %", h("span", { class: "muted" }, " ggü. Vorjahr"));
  }
  return h("div", { class: "kpi" + (invert ? " inv" : "") }, h("div", { class: "kpi-label" }, label), h("div", { class: "kpi-value" }, value), sub ? h("div", { class: "kpi-sub" }, sub) : null, d);
}

export const change = (a, b) => (a == null || b == null || b === 0 ? null : ((a - b) / Math.abs(b)) * 100);

// ---------- drill-down ----------
const drillState = new Map(); // key -> {path: [ids], sel: id|null}
const colorMemo = new Map();

function findNode(root, path) {
  let n = root;
  for (const id of path) {
    n = n?.children?.find((c) => c.id === id);
    if (!n) return null;
  }
  return n;
}

/**
 * Stable colours for the children of the node at `path`: ranked by size in the latest year with
 * data, the 7 largest get categorical slots, the rest share the neutral "Weitere" colour.
 * Colour follows the entity, so changing the year never repaints.
 */
function colorsFor(cfg, path) {
  const key = cfg.key + "|" + path.join("/");
  if (colorMemo.has(key)) return colorMemo.get(key);
  let ref = null;
  for (let i = cfg.years.length - 1; i >= 0 && !ref; i--) {
    const t = cfg.tree(cfg.years[i]);
    ref = t && findNode(t, path);
  }
  const t = theme();
  const map = {};
  const ranked = [...(ref?.children || [])].filter((c) => c.value > 0).sort((a, b) => b.value - a.value);
  const slots = ranked.length <= 8 ? 8 : 7; // up to 8 children: all colourable (8th = red)
  ranked.forEach((c, i) => (map[c.id] = i < Math.min(slots, 7) ? i : -1));
  if (ranked.length === 8) map[ranked[7].id] = 7;
  const res = { map, color: (id) => (map[id] == null || map[id] < 0 ? t.other : map[id] === 7 ? t.neg : t.series[map[id]]) };
  colorMemo.set(key, res);
  return res;
}
export function resetColorMemo() {
  colorMemo.clear();
}

/**
 * Drill-down block.
 * cfg: {key, rootLabel, tree(year)->node|null, years (with data), year, unit, onYear, emptyText, maxDepth}
 * node: {id, label, code?, value (Mio EUR), hint?, children?}
 */
export function drill(cfg) {
  const st = drillState.get(cfg.key) || { path: [], sel: null };
  drillState.set(cfg.key, st);
  const wrap = h("div", { class: "drill" });
  const rerender = () => wrap.replaceWith(drill(cfg));

  const root = cfg.tree(cfg.year);
  if (!root) {
    wrap.append(h("p", { class: "empty" }, cfg.emptyText || "Für dieses Jahr liegen keine Daten vor."));
    return wrap;
  }
  // trim path if this year lacks the node
  let node = findNode(root, st.path);
  while (!node && st.path.length) {
    st.path.pop();
    node = findNode(root, st.path);
  }
  const { color } = colorsFor(cfg, st.path);
  const kids = [...(node.children || [])].sort((a, b) => b.value - a.value);
  const sel = st.sel && kids.find((k) => k.id === st.sel);
  if (!sel) st.sel = null;

  const go = (path) => {
    st.path = path;
    st.sel = null;
    rerender();
  };
  const pick = (k) => {
    if (k.children?.length && st.path.length + 1 < (cfg.maxDepth || 9)) go([...st.path, k.id]);
    else {
      st.sel = st.sel === k.id ? null : k.id;
      rerender();
    }
  };

  // breadcrumb
  const crumbs = [{ label: cfg.rootLabel, path: [] }];
  let n = root;
  st.path.forEach((id, i) => {
    n = n.children.find((c) => c.id === id);
    crumbs.push({ label: n.label, path: st.path.slice(0, i + 1) });
  });
  wrap.append(
    h(
      "nav",
      { class: "crumbs", "aria-label": "Ebene" },
      crumbs.map((c, i) =>
        i === crumbs.length - 1
          ? h("span", { class: "here" }, c.label)
          : [h("button", { type: "button", class: "link", onclick: () => go(c.path) }, c.label), h("span", { class: "sep" }, "›")],
      ),
      st.path.length ? h("button", { type: "button", class: "back", onclick: () => go(st.path.slice(0, -1)) }, "← zurück") : null,
    ),
  );

  const total = node.value;
  const posSum = kids.reduce((a, k) => a + Math.max(0, k.value), 0);

  // donut items: coloured children + grouped "Weitere"
  const items = [];
  let other = 0;
  const otherNames = [];
  for (const k of kids) {
    if (k.value <= 0) continue;
    if (colorsFor(cfg, st.path).map[k.id] >= 0) items.push({ id: k.id, label: k.label, value: k.value, color: color(k.id), clickable: true });
    else {
      other += k.value;
      otherNames.push(k.label);
    }
  }
  if (other > 0)
    items.push({ id: "__other", label: `Weitere (${otherNames.length})`, value: other, color: theme().other, hint: otherNames.slice(0, 8).join(", ") + (otherNames.length > 8 ? ", …" : "") });

  const donutEl = h("div", { class: "donut", role: "img", "aria-label": `Kreisdiagramm: ${node.label}` });
  const maxAbs = Math.max(...kids.map((k) => Math.abs(k.value)), 1);
  const list = h(
    "ol",
    { class: "ranklist" },
    kids.map((k) => {
      const share = posSum ? (k.value / posSum) * 100 : null;
      const canDrill = k.children?.length && st.path.length + 1 < (cfg.maxDepth || 9);
      return h(
        "li",
        { class: (k.id === st.sel ? "sel " : "") + (k.value < 0 ? "neg" : "") },
        h(
          "button",
          { type: "button", onclick: () => pick(k), title: (k.title ? k.title + " – " : "") + (canDrill ? "Details anzeigen" : "Entwicklung anzeigen") },
          h("span", { class: "sw", style: { background: color(k.id) } }),
          h("span", { class: "name" }, k.code ? h("span", { class: "code" }, k.code) : null, k.label),
          h("span", { class: "val" }, fmt(conv(k.value, cfg.year, cfg.unit), cfg.unit)),
          h("span", { class: "share" }, k.value < 0 ? "abzgl." : pct(share)),
          h("span", { class: "bar" }, h("i", { style: { width: (Math.abs(k.value) / maxAbs) * 100 + "%", background: color(k.id) } })),
          h("span", { class: "chev", "aria-hidden": "true" }, canDrill ? "›" : ""),
        ),
      );
    }),
  );
  const unitTotal = conv(total, cfg.year, cfg.unit);
  wrap.append(
    h("div", { class: "drill-body" }, h("div", { class: "donut-wrap" }, donutEl), h("div", { class: "list-wrap" }, kids.length ? list : h("p", { class: "empty" }, "Keine weitere Aufschlüsselung verfügbar."))),
  );
  if (cfg.note) wrap.append(h("p", { class: "note" }, cfg.note));

  // trend
  const trendEl = h("div", { class: "chart trend" });
  const focus = sel || null;
  const trendTitle = focus ? focus.label : node.label;
  wrap.append(h("h4", { class: "trend-title" }, "Entwicklung: ", trendTitle, h("span", { class: "muted" }, focus ? "" : " – nach Bestandteilen")), trendEl);

  requestAnimationFrame(() => {
    if (!donutEl.isConnected) return;
    donut(donutEl, {
      items,
      unit: cfg.unit,
      year: cfg.year,
      centerTop: fmt(unitTotal, cfg.unit),
      centerBottom: String(cfg.year),
      onClick: (id) => {
        const k = kids.find((x) => x.id === id);
        if (k) pick(k);
      },
    });
    const ys = cfg.years;
    const nodesByYear = ys.map((y) => {
      const t = cfg.tree(y);
      return t && findNode(t, st.path);
    });
    let series;
    if (focus) {
      series = [{ name: focus.label, color: color(focus.id), area: true, data: ys.map((y, i) => conv(nodesByYear[i]?.children?.find((c) => c.id === focus.id)?.value, y, cfg.unit)) }];
    } else if (kids.length) {
      const colored = kids.filter((k) => colorsFor(cfg, st.path).map[k.id] >= 0);
      const coloredIds = new Set(colored.map((k) => k.id));
      // series order: largest at the bottom of the stack
      series = colored.map((k) => ({
        name: k.label,
        color: color(k.id),
        area: true,
        stack: "s",
        data: ys.map((y, i) => conv(nodesByYear[i]?.children?.find((c) => c.id === k.id)?.value ?? (nodesByYear[i] ? 0 : null), y, cfg.unit)),
      }));
      const restData = ys.map((y, i) => {
        const nd = nodesByYear[i];
        if (!nd) return null;
        return conv((nd.children || []).filter((c) => !coloredIds.has(c.id)).reduce((a, c) => a + c.value, 0), y, cfg.unit);
      });
      if (restData.some((v) => v)) series.push({ name: "Weitere", color: theme().other, area: true, stack: "s", data: restData });
    } else {
      series = [{ name: node.label, color: theme().series[0], area: true, data: ys.map((y, i) => conv(nodesByYear[i]?.value, y, cfg.unit)) }];
    }
    timeChart(trendEl, { years: ys, series, unit: cfg.unit, year: cfg.year, onYear: cfg.onYear, total: !focus && series.length > 1 });
  });
  return wrap;
}
