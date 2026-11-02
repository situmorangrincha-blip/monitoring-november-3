// Model DAP: kolom bebas pilih, SKU fokus dari database SKU, halaman Fokus Pareto (satu toko = satu kartu).
import { dapForDate, parseRoute, visitDays, weekdayName } from './calc.js';

const rp = (n) => Math.round(n || 0).toLocaleString('id-ID');
const qf = (n) => (Number.isInteger(n) ? n.toLocaleString('id-ID') : (n || 0).toLocaleString('id-ID', { maximumFractionDigits: 1 }));
const pc = (r) => (r == null ? '-' : Math.round(r * 100) + '%');

export const sbKey = (sb) => sb.c || sb.n;

// kolom identitas selalu ada: No, Nama Toko, ID
export const COLS = [
  { k: 'ch', label: 'Channel', w: 30, get: (r) => r.ch },
  { k: 'par', label: 'Pareto', w: 14, get: (r, c) => (c.store?.pj ? 'P' : '') },
  { k: 'size', label: 'Ukuran', w: 17, get: (r, c) => (c.store?.size && c.store.size !== 'LAINNYA' ? c.store.size : '') },
  { k: 't', label: 'Target DAP', w: 22, al: 'right', get: (r) => rp(r.t) },
  { k: 'a', label: 'Actual', w: 20, al: 'right', get: (r) => rp(r.a) },
  { k: 'gap', label: 'Gap', w: 22, al: 'right', neg: true, get: (r) => rp(r.gap) },
  { k: 'sisa', label: 'Sisa', w: 10, al: 'center', get: (r) => `${r.sisa}x` },
  { k: 'plan', label: 'PLAN', w: 22, al: 'right', bold: true, get: (r) => (r.done ? 'tercapai' : rp(r.plan)) },
  { k: 'e', label: 'Estimasi', w: 20, al: 'right', get: (r) => (r.e ? rp(r.e) : '') },
  { k: 'so', label: 'Actual SO', w: 18, al: 'right', get: (r) => (r.so ? rp(r.so) : '') },
  { k: 'qty', label: 'Qty MTD', w: 17, al: 'right', get: (r, c) => (c.qty ? qf(c.qty) : '') },
  { k: 'lm', label: 'Sep', w: 19, al: 'right', get: (r, c) => (c.store?.lm ? rp(c.store.lm) : '') },
  { k: 'l3m', label: 'L3M/bln', w: 19, al: 'right', get: (r, c) => (c.store?.l3m ? rp(c.store.l3m) : '') },
  { k: 'vsLm', label: 'vs Sep', w: 14, al: 'right', get: (r, c) => (c.store?.lm && c.tg > 0 ? pc(c.store.act / (c.store.lm * c.tg)) : '') },
  { k: 'ca', label: 'CA', w: 12, al: 'center', get: (r, c) => (c.store ? (c.store.act >= 1 ? 'Ya' : 'Belum') : '') },
  { k: 'gs', label: 'GreenStore', w: 17, al: 'center', get: (r, c) => c.prog?.GreenStore || '' },
  { k: 'mss', label: 'MSS', w: 15, al: 'center', get: (r, c) => c.prog?.MSS || '' },
  { k: 'note', label: 'Catatan', w: 0, get: () => '' },
  { k: 'blank', label: '', w: 22, get: () => '' },
];
export const COL_BY = Object.fromEntries(COLS.map((c) => [c.k, c]));

export function colFor(k, data) {
  if (COL_BY[k]) return COL_BY[k];
  if (k.startsWith('promo:')) {
    const p = (data.promos || []).find((x) => 'promo:' + x.id === k);
    if (!p) return null;
    const set = new Set(p.ids);
    return { k, label: p.name, w: Math.min(26, Math.max(14, Math.ceil(p.name.length * 1.6))), al: 'center', get: (r) => (set.has(r.id) ? 'Ya' : '') };
  }
  return null;
}
export const promoCols = (data) => (data.promos || []).map((p) => 'promo:' + p.id);

export const DEFAULT_DAP = {
  cols: ['ch', 't', 'a', 'gap', 'sisa', 'plan', 'e', 'so', 'note'],
  skuMain: [], skuMetric: 'qty',
  par: { on: false, perPage: 1, unit: 'both', inds: ['tgt', 'act', 'qty', 'gap', 'ca'], focus: [], hdr: true, notes: true, blank: true },
};

// SKU yang bisa dipilih: database SKU (kode, nama, brand, kategori) + SKU yang muncul di data qty
export function skuOptions(data) {
  const m = new Map();
  for (const x of data.skudb || []) m.set(x.c, { k: x.c, n: x.n, b: x.b || '', cat: x.k || '', inData: false });
  for (const sb of data.subs) {
    const k = sbKey(sb);
    const o = m.get(k) || { k, n: sb.n, b: sb.b || '', cat: sb.k || '', inData: false };
    o.inData = true; o.n = o.n || sb.n; o.b = o.b || sb.b; o.cat = o.cat || sb.k || '';
    m.set(k, o);
  }
  return [...m.values()].sort((a, b) => a.n.localeCompare(b.n));
}
const catOf = (o) => o.cat || (o.b && o.b !== '-' ? o.b : '');
export function catOptions(data) {
  return [...new Set(skuOptions(data).map(catOf).filter(Boolean))].sort();
}
// semua SKU dalam satu kategori (kalau database tidak punya kolom kategori, dipakai brand)
export const skusOfCat = (data, cat) => skuOptions(data).filter((o) => catOf(o) === cat);

// nilai satu toko untuk satu item fokus ({t:'sku'|'cat', k})
export function focusVal(data, id, f) {
  let act = 0, qty = 0, tgt = 0;
  data.subs.forEach((sb, i) => {
    const hit = f.t === 'sku' ? sbKey(sb) === f.k : (sb.k || sb.b) === f.k;
    if (!hit) return;
    act += data.cat?.cur?.[id]?.[i] || 0;
    qty += data.qty?.cur?.[id]?.[i] || 0;
    tgt += data.skuTgt?.[id]?.[i] || 0;
  });
  return { act, qty, tgt };
}
export const focusName = (data, f) => (f.t === 'sku' ? (skuOptions(data).find((x) => x.k === f.k)?.n || f.k) : f.k);

function storeProg(data, s) {
  const o = {};
  for (const x of data.prog || []) {
    if (x.id === s.id && x.t) o[x.p] = `${x.a}/${x.t}`;
  }
  return o;
}

// susun seluruh isi DAP satu tanggal
export function buildDap(data, time, d, holidays, cfg) {
  const res = dapForDate(data, time.y, time.m, d, holidays);
  const byKey = new Map(data.stores.map((s) => [s.id + '|' + s.sales.toUpperCase(), s]));
  const colDefs = cfg.cols.map((k) => colFor(k, data)).filter(Boolean);
  const metrics = cfg.skuMetric === 'both' ? ['qty', 'rp'] : [cfg.skuMetric === 'rp' ? 'rp' : 'qty'];
  const skuCols = cfg.skuMain.flatMap((k) => metrics.map((mt) => {
    const nm = focusName(data, { t: 'sku', k });
    const label = metrics.length > 1 ? `${nm} (${mt === 'qty' ? 'Qty' : 'Rp'})` : nm;
    return { k: 'sku:' + k + ':' + mt, label, w: Math.min(30, Math.max(mt === 'rp' ? 20 : 15, Math.ceil(label.length * 1.5))), al: 'right', sku: k, metric: mt };
  }));
  const head = [{ label: 'No', w: 9, al: 'center' }, { label: 'Nama Toko', w: 52 }, { label: 'ID Pelanggan', w: 28 }, ...colDefs.filter((c) => c.k !== 'note' && c.k !== 'blank'), ...skuCols, ...colDefs.filter((c) => c.k === 'note' || c.k === 'blank')];
  const wd = new Date(time.y, time.m - 1, d).getDay();

  const qtyOfStore = (id) => Object.values(data.qty?.cur?.[id] || {}).reduce((a, b) => a + b, 0);
  const groups = res.groups.map((g) => {
    const rows = g.list.map((r, i) => {
      const store = byKey.get(r.id + '|' + r.s.toUpperCase());
      const ctx = { store, tg: time.tg, qty: store ? qtyOfStore(store.id) : 0, prog: store ? storeProg(data, store) : {} };
      const cells = head.map((c, ci) => {
        if (ci === 0) return i + 1;
        if (ci === 1) return r.n;
        if (ci === 2) return r.id;
        if (c.sku) { const v = focusVal(data, r.id, { t: 'sku', k: c.sku }); return c.metric === 'qty' ? qf(v.qty) : rp(v.act); }
        return c.get(r, ctx);
      });
      return { r, cells };
    });
    // halaman Fokus Pareto: toko Pareto JKS salesman ini yang jadwalnya jatuh di tanggal DAP
    const inDap = new Set(g.list.map((x) => x.id));
    const cards = !cfg.par.on ? [] : data.stores
      .filter((s) => s.sales.toUpperCase() === g.name.toUpperCase() && s.pj && visitDays(parseRoute(s.hk), time.y, time.m, holidays).includes(d))
      .sort((a, b) => b.l3m - a.l3m || b.act - a.act)
      .map((s) => {
        const dr = g.list.find((x) => x.id === s.id);
        const items = cfg.par.focus.map((f) => ({ f, g: f.g || '', name: focusName(data, f), ...focusVal(data, s.id, f) }));
        return { s, dr, notInDap: !inDap.has(s.id), items, qty: qtyOfStore(s.id), prog: storeProg(data, s), programs: (data.promos || []).filter((x) => x.ids.includes(s.id)).map((x) => x.name) };
      });
    return { name: g.name, n: g.n, target: g.target, actual: g.actual, plan: g.plan, rows, cards };
  });
  const hasTgt = groups.some((g) => g.cards.some((c) => c.items.some((it) => it.tgt > 0)));
  return { head, groups, wd, hasTgt, total: res.total, unparsed: res.unparsed };
}

// kolom tabel kartu Pareto sesuai indikator terpilih
export function cardColumns(par, hasTgt = true) {
  const cols = [{ k: 'name', label: 'Fokus', w: 70 }];
  const showQty = par.unit !== 'rp';
  const showRp = par.unit !== 'qty';
  const I = new Set(par.inds);
  if (I.has('tgt') && hasTgt) cols.push({ k: 'tgt', label: 'Target', al: 'right', w: 24 });
  if (I.has('act') && showRp) cols.push({ k: 'act', label: 'Actual (Rp)', al: 'right', w: 28 });
  if (I.has('qty') && showQty) cols.push({ k: 'qty', label: 'Qty', al: 'right', w: 18 });
  if (I.has('gap') && hasTgt) cols.push({ k: 'gap', label: 'Gap', al: 'right', w: 24 });
  if (I.has('ach') && hasTgt) cols.push({ k: 'ach', label: '% Ach', al: 'right', w: 16 });
  if (I.has('ca')) cols.push({ k: 'ca', label: 'Sudah beli?', al: 'center', w: 22 });
  if (par.blank) cols.push({ k: 'order', label: 'Order', w: 26 });
  if (par.notes) cols.push({ k: 'note', label: 'Catatan', w: 0 });
  return cols;
}
export function cardRows(card, cols) {
  const rows = [];
  const bold = new Set();
  const sumOf = (list) => list.reduce((a, x) => ({ act: a.act + x.act, qty: a.qty + x.qty, tgt: a.tgt + x.tgt }), { act: 0, qty: 0, tgt: 0 });
  const line = (it) => cols.map((c) => {
    switch (c.k) {
      case 'name': return it.name;
      case 'tgt': return it.tgt ? rp(it.tgt) : '';
      case 'act': return rp(it.act);
      case 'qty': return qf(it.qty);
      case 'gap': return it.tgt ? rp(it.act - it.tgt) : '';
      case 'ach': return it.tgt ? pc(it.act / it.tgt) : '';
      case 'ca': return it.act > 0 || it.qty > 0 ? 'Ya' : 'Belum';
      default: return '';
    }
  });
  const total = (label, list) => line({ name: label, ...sumOf(list), act: sumOf(list).act, qty: sumOf(list).qty, tgt: sumOf(list).tgt }).map((v, i) => (cols[i].k === 'ca' ? '' : v));
  let i = 0;
  while (i < card.items.length) {
    const g = card.items[i].g;
    let j = i;
    while (j < card.items.length && card.items[j].g === g) j++;
    const grp = card.items.slice(i, j);
    grp.forEach((it) => rows.push(line(it)));
    if (g && grp.length > 1) { bold.add(rows.length); rows.push(total('Total ' + g, grp)); }
    i = j;
  }
  const groups = new Set(card.items.map((x) => x.g));
  if (card.items.length > 1 && (groups.size > 1 || groups.has(''))) { bold.add(rows.length); rows.push(total('Total fokus', card.items)); }
  rows.bold = bold;
  return rows;
}
export const cardHeadLine = (card) => {
  const s = card.s;
  const bits = [`Sep ${rp(s.lm)}`, `L3M/bln ${rp(s.l3m)}`, '(level toko)'];
  const totAct = card.items.reduce((a, x) => a + x.act, 0);
  if (card.items.length && s.l3m > 0) bits.push(`Fokus = ${pc(totAct / s.l3m)} dari rata-rata L3M toko`);
  for (const [p, v] of Object.entries(card.prog)) bits.push(`${p} ${v}`);
  if (card.programs?.length) bits.push(`Program: ${card.programs.join(', ')}`);
  return bits.join('  |  ');
};
export { weekdayName };
