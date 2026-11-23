/* =========================================================
   Burraco – funzioni comuni (storage, header, utility, statistiche)
   ========================================================= */
const STORAGE_KEY = 'burraco_partite_v1';

const Store = {
  all() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch (e) { return []; }
  },
  save(list) { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); },
  get(id) { return this.all().find(g => g.id === id); },
  upsert(game) {
    const list = this.all();
    const i = list.findIndex(g => g.id === game.id);
    if (i >= 0) list[i] = game; else list.push(game);
    this.save(list);
  },
  remove(id) { this.save(this.all().filter(g => g.id !== id)); }
};

/* ---------- utility ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = s => String(s || '').trim().toLowerCase();
const num = v => { const n = parseInt(v, 10); return isNaN(n) ? 0 : n; };
const fmt = n => (Math.round(n) || 0).toLocaleString('it-IT');
const fmt1 = n => (isFinite(n) ? n : 0).toLocaleString('it-IT', { maximumFractionDigits: 1 });
const pct = (a, b) => b ? Math.round((a / b) * 100) : 0;
const today = () => new Date().toISOString().slice(0, 10);
const fmtDate = d => {
  if (!d) return '';
  const [y, m, g] = d.split('-');
  return `${g}/${m}/${y}`;
};

function teamPlayers(arr) { return (arr || []).map(s => String(s || '').trim()).filter(Boolean); }
function teamName(arr) { return teamPlayers(arr).join(' & ') || '—'; }
function teamKey(arr) { return teamPlayers(arr).map(norm).sort().join('|'); }

/** Esito della partita: 'A', 'B' o 'X' (pareggio) */
function winner(g) {
  if (g.puntiA > g.puntiB) return 'A';
  if (g.puntiB > g.puntiA) return 'B';
  return 'X';
}

/** Dati di un lato (A o B) di una partita, dal punto di vista di quel lato */
function side(g, s) {
  const other = s === 'A' ? 'B' : 'A';
  const w = winner(g);
  return {
    game: g,
    players: teamPlayers(s === 'A' ? g.a : g.b),
    opponents: teamPlayers(s === 'A' ? g.b : g.a),
    punti: s === 'A' ? g.puntiA : g.puntiB,
    avv: s === 'A' ? g.puntiB : g.puntiA,
    puliti: num(s === 'A' ? g.pulitiA : g.pulitiB),
    sporchi: num(s === 'A' ? g.sporchiA : g.sporchiB),
    chiusura: g.chiusura === s,
    esito: w === 'X' ? 'N' : (w === s ? 'V' : 'P'),
    other
  };
}

/** Elenco di tutti i giocatori (nome con la grafia più recente) */
function allPlayers(list = Store.all()) {
  const map = new Map();
  list.forEach(g => [...teamPlayers(g.a), ...teamPlayers(g.b)].forEach(p => map.set(norm(p), p)));
  return [...map.values()].sort((a, b) => a.localeCompare(b, 'it'));
}

function sortByDate(list, desc = true) {
  return [...list].sort((x, y) => {
    const c = (x.data || '').localeCompare(y.data || '') || (x.creato || 0) - (y.creato || 0);
    return desc ? -c : c;
  });
}

/** Statistiche aggregate per una serie di "lati" */
function newAgg(label) {
  return { label, g: 0, v: 0, p: 0, n: 0, pf: 0, ps: 0, puliti: 0, sporchi: 0, chiusure: 0, max: -Infinity, forma: [] };
}
function addToAgg(a, sd) {
  a.g++; a[sd.esito === 'V' ? 'v' : sd.esito === 'P' ? 'p' : 'n']++;
  a.pf += sd.punti; a.ps += sd.avv;
  a.puliti += sd.puliti; a.sporchi += sd.sporchi;
  if (sd.chiusura) a.chiusure++;
  a.max = Math.max(a.max, sd.punti);
  a.forma.push(sd.esito);
}
function finalizeAgg(a) {
  a.winPct = pct(a.v, a.g);
  a.media = a.g ? a.pf / a.g : 0;
  a.diff = a.g ? (a.pf - a.ps) / a.g : 0;
  a.burraci = a.puliti + a.sporchi;
  if (a.max === -Infinity) a.max = 0;
  a.forma = a.forma.slice(-5);
  // serie in corso
  let s = 0, t = null;
  for (let i = a.forma.length - 1; i >= 0; i--) {
    if (t === null) t = a.forma[i];
    if (a.forma[i] === t) s++; else break;
  }
  a.serie = t ? `${s}${t}` : '';
  return a;
}

function statsByPlayer(list = Store.all()) {
  const m = new Map();
  sortByDate(list, false).forEach(g => ['A', 'B'].forEach(s => {
    const sd = side(g, s);
    sd.players.forEach(p => {
      const k = norm(p);
      if (!m.has(k)) m.set(k, newAgg(p));
      m.get(k).label = p;
      addToAgg(m.get(k), sd);
    });
  }));
  return [...m.values()].map(finalizeAgg);
}

function statsByTeam(list = Store.all()) {
  const m = new Map();
  sortByDate(list, false).forEach(g => ['A', 'B'].forEach(s => {
    const sd = side(g, s);
    const k = teamKey(sd.players);
    if (!k) return;
    if (!m.has(k)) m.set(k, newAgg(teamName(sd.players)));
    addToAgg(m.get(k), sd);
  }));
  return [...m.values()].map(finalizeAgg);
}

/* ---------- grafica carte ---------- */
const SUITS = { h: '♥', d: '♦', s: '♠', c: '♣' };
function cardHTML(rank, suit) {
  if (rank === 'J*') {
    return `<div class="card joker"><span class="c-tl red">★</span><div class="c-mid"><span>JOLLY</span></div><span class="c-br">★</span></div>`;
  }
  if (rank === 'back') return `<div class="card back"></div>`;
  const sym = SUITS[suit];
  const col = (suit === 'h' || suit === 'd') ? 'red' : 'black';
  return `<div class="card ${col}"><span class="c-tl">${rank}<br>${sym}</span><div class="c-mid">${sym}</div><span class="c-br">${rank}<br>${sym}</span></div>`;
}

function formDots(arr) {
  return `<span class="form-dots">${arr.map(e => `<span class="dot ${e}" title="${e === 'V' ? 'Vittoria' : e === 'P' ? 'Sconfitta' : 'Pareggio'}">${e}</span>`).join('')}</span>`;
}

/* ---------- header / nav ---------- */
const PAGES = [
  { id: 'nuova', href: 'index.html', label: 'Nuova partita', suit: '♥', red: true },
  { id: 'statistiche', href: 'statistiche.html', label: 'Statistiche', suit: '♠' },
  { id: 'partite', href: 'partite.html', label: 'Partite', suit: '♦', red: true },
  { id: 'tavoli', href: 'tavoli.html', label: 'Tavoli', suit: '♣' }
];

function renderHeader() {
  const el = document.getElementById('site-header');
  if (!el) return;
  const active = document.body.dataset.page;
  el.className = 'site-header';
  el.innerHTML = `
    <div class="header-inner">
      <a class="brand" href="index.html">
        <div class="fan">${cardHTML('A', 'h')}${cardHTML('K', 's')}${cardHTML('J*')}${cardHTML('2', 'c')}</div>
        <div class="brand-title"><h1>Burraco</h1><small>Segnapunti &amp; statistiche del tavolo</small></div>
      </a>
      <nav class="nav">
        ${PAGES.map(p => `<a href="${p.href}" class="${p.id === active ? 'active' : ''}"><span class="suit ${p.red ? 'red' : 'black'}">${p.suit}</span>${p.label}</a>`).join('')}
      </nav>
    </div>`;
  const f = document.createElement('footer');
  f.innerHTML = '♥ ♠ ♦ ♣ &nbsp;·&nbsp; I dati sono salvati nel browser di questo dispositivo. Usa “Esporta” nella pagina Partite per fare un backup.';
  document.body.appendChild(f);
}

function toast(msg) {
  let t = $('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove('show'), 2400);
}

/** Tabella ordinabile: cols = [{key, label, num, render}] */
function sortableTable(container, rows, cols, initialKey, initialDesc = true) {
  let key = initialKey, desc = initialDesc;
  function draw() {
    const sorted = [...rows].sort((x, y) => {
      const a = x[key], b = y[key];
      const c = typeof a === 'string' ? a.localeCompare(b, 'it') : a - b;
      return desc ? -c : c;
    });
    container.innerHTML = `<div class="table-wrap"><table>
      <thead><tr><th>#</th>${cols.map(c => `<th data-k="${c.key}" class="${c.sortable === false ? '' : 'sortable'} ${c.num ? 'num' : ''} ${c.key === key ? 'sorted' + (desc ? '' : ' asc') : ''}" title="${esc(c.title || '')}">${c.label}</th>`).join('')}</tr></thead>
      <tbody>${sorted.map((r, i) => `<tr class="${i === 0 ? 'top1' : ''}"><td class="rank">${i === 0 ? '♛' : i + 1}</td>${cols.map(c => `<td class="${c.num ? 'num' : ''}">${c.render ? c.render(r) : esc(r[c.key])}</td>`).join('')}</tr>`).join('')}</tbody>
    </table></div>`;
    $$('th.sortable', container).forEach(th => th.onclick = () => {
      const k = th.dataset.k;
      if (k === key) desc = !desc; else { key = k; desc = true; }
      draw();
    });
  }
  draw();
}

function emptyState(msg, link = true) {
  return `<div class="empty"><div class="cards">${cardHTML('back')}${cardHTML('J*')}${cardHTML('back')}</div>
    <p>${msg}</p>${link ? '<a class="btn gold" href="index.html">♥ Inserisci una partita</a>' : ''}</div>`;
}

document.addEventListener('DOMContentLoaded', renderHeader);
