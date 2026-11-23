/* Pagina: inserimento / modifica partita */
(function () {
  const form = $('#game-form');
  const body = $('#hands-body');
  const editId = new URLSearchParams(location.search).get('edit');
  let hands = [];

  function fillPlayers() {
    $('#players').innerHTML = allPlayers().map(p => `<option value="${esc(p)}">`).join('');
  }

  function drawHands() {
    let ta = 0, tb = 0;
    body.innerHTML = hands.map((h, i) => {
      ta += num(h.a); tb += num(h.b);
      return `<tr>
        <td class="rank">${i + 1}</td>
        <td class="num"><input type="number" step="5" data-i="${i}" data-s="a" value="${h.a ?? ''}"></td>
        <td class="num"><input type="number" step="5" data-i="${i}" data-s="b" value="${h.b ?? ''}"></td>
        <td class="num">${fmt(ta)} – ${fmt(tb)}</td>
        <td><button type="button" class="btn danger small" data-del="${i}" title="Rimuovi">✕</button></td>
      </tr>`;
    }).join('') || `<tr><td colspan="5" class="hint">Nessuna smazzata inserita.</td></tr>`;
    syncTotals();
  }

  function syncTotals() {
    const has = hands.length > 0;
    ['A', 'B'].forEach(s => {
      const inp = $('#punti' + s);
      inp.readOnly = has;
      if (has) inp.value = hands.reduce((t, h) => t + num(h[s.toLowerCase()]), 0);
    });
    updatePreview();
  }

  function updatePreview() {
    const nA = teamName([$('#a1').value, $('#a2').value]);
    const nB = teamName([$('#b1').value, $('#b2').value]);
    $$('.lbl-a').forEach(e => e.textContent = nA === '—' ? 'Coppia A' : nA);
    $$('.lbl-b').forEach(e => e.textContent = nB === '—' ? 'Coppia B' : nB);
    $('#chiusura').options[1].text = nA === '—' ? 'Coppia A' : nA;
    $('#chiusura').options[2].text = nB === '—' ? 'Coppia B' : nB;
    const a = num($('#puntiA').value), b = num($('#puntiB').value);
    const obj = num($('#obiettivo').value);
    let lead = 'Parità';
    if (a !== b) lead = `${a > b ? nA : nB} in vantaggio di ${fmt(Math.abs(a - b))} punti`;
    const reached = obj && (a >= obj || b >= obj) ? ` · obiettivo ${fmt(obj)} raggiunto` : '';
    $('#preview').innerHTML = `
      <div class="p-team">${esc(nA === '—' ? 'Coppia A' : nA)}</div>
      <div class="p-score">${fmt(a)} <span style="opacity:.5">–</span> ${fmt(b)}</div>
      <div class="p-team">${esc(nB === '—' ? 'Coppia B' : nB)}</div>
      <div class="p-lead">${esc(lead)}${reached}</div>`;
  }

  body.addEventListener('input', e => {
    const t = e.target;
    if (t.dataset.i === undefined) return;
    hands[t.dataset.i][t.dataset.s] = t.value === '' ? '' : num(t.value);
    // aggiorna solo il progressivo senza perdere il focus
    let ta = 0, tb = 0;
    $$('tr', body).forEach((tr, i) => {
      ta += num(hands[i].a); tb += num(hands[i].b);
      tr.children[3].textContent = `${fmt(ta)} – ${fmt(tb)}`;
    });
    syncTotals();
  });
  body.addEventListener('click', e => {
    const d = e.target.closest('[data-del]');
    if (!d) return;
    hands.splice(+d.dataset.del, 1);
    drawHands();
  });
  $('#add-hand').onclick = () => {
    hands.push({ a: '', b: '' });
    drawHands();
    const inputs = $$('input', body);
    inputs[inputs.length - 2]?.focus();
  };

  form.addEventListener('input', e => { if (!body.contains(e.target)) updatePreview(); });

  function resetForm() {
    form.reset();
    hands = [];
    $('#data').value = today();
    $('#obiettivo').value = 2005;
    drawHands();
  }
  $('#reset-btn').onclick = resetForm;

  function load(g) {
    $('#data').value = g.data || today();
    $('#luogo').value = g.luogo || '';
    $('#obiettivo').value = g.obiettivo || 2005;
    [['a1', g.a[0]], ['a2', g.a[1]], ['b1', g.b[0]], ['b2', g.b[1]]].forEach(([id, v]) => $('#' + id).value = v || '');
    $('#puntiA').value = g.puntiA; $('#puntiB').value = g.puntiB;
    $('#pulitiA').value = g.pulitiA || 0; $('#sporchiA').value = g.sporchiA || 0;
    $('#pulitiB').value = g.pulitiB || 0; $('#sporchiB').value = g.sporchiB || 0;
    $('#chiusura').value = g.chiusura || '';
    $('#note').value = g.note || '';
    hands = (g.smazzate || []).map(h => ({ ...h }));
    drawHands();
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    const a = teamPlayers([$('#a1').value, $('#a2').value]);
    const b = teamPlayers([$('#b1').value, $('#b2').value]);
    const names = [...a, ...b].map(norm);
    if (new Set(names).size !== names.length) { toast('Lo stesso giocatore compare due volte'); return; }
    if ($('#puntiA').value === '' || $('#puntiB').value === '') { toast('Inserisci il punteggio di entrambe le coppie'); return; }

    const old = editId ? Store.get(editId) : null;
    const g = {
      id: old ? old.id : uid(),
      creato: old ? old.creato : Date.now(),
      data: $('#data').value || today(),
      luogo: $('#luogo').value.trim(),
      obiettivo: num($('#obiettivo').value),
      a, b,
      puntiA: num($('#puntiA').value),
      puntiB: num($('#puntiB').value),
      pulitiA: num($('#pulitiA').value), sporchiA: num($('#sporchiA').value),
      pulitiB: num($('#pulitiB').value), sporchiB: num($('#sporchiB').value),
      chiusura: $('#chiusura').value,
      note: $('#note').value.trim(),
      smazzate: hands.filter(h => h.a !== '' || h.b !== '').map(h => ({ a: num(h.a), b: num(h.b) }))
    };
    Store.upsert(g);
    if (old) { location.href = 'partite.html?saved=1'; return; }
    const w = winner(g);
    toast(w === 'X' ? 'Partita salvata: pareggio!' : `Partita salvata · vince ${teamName(w === 'A' ? a : b)} ♛`);
    // mantiene i giocatori per la partita successiva
    const keep = { a1: $('#a1').value, a2: $('#a2').value, b1: $('#b1').value, b2: $('#b2').value };
    resetForm();
    Object.entries(keep).forEach(([k, v]) => $('#' + k).value = v);
    fillPlayers();
    updatePreview();
  });

  // init
  fillPlayers();
  resetForm();
  if (editId) {
    const g = Store.get(editId);
    if (g) {
      load(g);
      $('#form-title').textContent = 'Modifica partita';
      $('#save-btn').textContent = '♛ Salva modifiche';
      $('#cancel-edit').hidden = false;
    }
  }
  updatePreview();
})();
