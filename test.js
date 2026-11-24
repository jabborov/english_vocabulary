// Run from the project folder: npm install jsdom && node test.js
const { JSDOM, ResourceLoader, VirtualConsole } = require('jsdom');
class Local extends ResourceLoader { fetch(url,o){ return url.startsWith('file:') ? super.fetch(url,o) : null; } }
const vc = new VirtualConsole(); vc.on('jsdomError', e => { if(!/Could not load link|Not implemented: window\.scrollTo/.test(e.message)) console.error(e.message); });
const path = require('path');
const assert = require('assert');
const store = {};               // shared localStorage across page loads
// Text of the example sentences shown in a card (without the A1…C2 level tags).
// The word shown in the Random box: { part, k, title, it, set } (the topic + word identify it exactly).
function rwEntry(w){
  const d = w.document, m = /^Part ([12]) · (\d{4}) · /.exec(d.getElementById('rw-topic').textContent);
  assert.ok(m, 'topic line: ' + d.getElementById('rw-topic').textContent);
  const data = m[1] === '1' ? w.VOCAB_DATA_PART1 : w.VOCAB_DATA, ex = m[1] === '1' ? w.VOCAB_EXAMPLES_PART1 : w.VOCAB_EXAMPLES;
  const word = d.getElementById('rw-word').textContent, t = data[m[2]];
  const it = t.words.find(x => x.w === word);
  assert.ok(it, 'word exists: ' + word);
  return { part: m[1], k: m[2], title: t.title, it, set: (ex[m[2]] || {})[word] };
}
const exTexts = el => [...el.querySelectorAll('.entry-ex, .rw-ex')].map(e => (e.querySelector('.ex-t, .rw-t') || e).textContent);
async function load(url, setup){
  const dom = await JSDOM.fromFile(path.join(__dirname, url.split('?')[0]), {
    url: 'file://' + path.join(__dirname, url),
    runScripts: 'dangerously', resources: new Local(), virtualConsole: vc,
    beforeParse(w){
      const ls = { getItem:k=>k in store?store[k]:null, setItem:(k,v)=>{store[k]=String(v)}, removeItem:k=>{delete store[k]} };
      Object.defineProperty(w,'localStorage',{value:ls});
      w.matchMedia = () => ({ matches:false });
      w.__errors = []; w.addEventListener('error', e => w.__errors.push(e.message));
      if (setup) setup(w);         // e.g. replace window.confirm before the page scripts run
    }
  });
  await new Promise(r => dom.window.addEventListener('load', r));
  assert.deepStrictEqual(dom.window.__errors, [], 'JS errors: ' + dom.window.__errors);
  return dom.window;
}
(async () => {
  // index page: Part 2 by default, Part 1 / Part 2 switch (remembered)
  let w = await load('index.html');
  const P2 = Object.keys(w.VOCAB_DATA), P1 = Object.keys(w.VOCAB_DATA_PART1);
  assert.strictEqual(P2.length, 80);
  assert.strictEqual(P1.length, 508);
  const cardKeys = () => [...w.document.querySelectorAll('.topic-card')].map(a => a.getAttribute('href'));
  assert.deepStrictEqual(cardKeys(), P2.map(k => `topic.html?topic=${k}`));
  w.document.querySelector('.part-btn[data-part="1"]').click();
  assert.deepStrictEqual(cardKeys(), P1.map(k => `topic.html?topic=${k}&part=1`));
  assert.strictEqual(store['vocab-part'], '1');
  w = await load('index.html');                                    // remembered
  assert.strictEqual(w.document.querySelectorAll('.topic-card').length, 508);
  w.document.querySelector('.part-btn[data-part="2"]').click();
  assert.strictEqual(w.document.querySelectorAll('.topic-card').length, 80);
  assert.strictEqual(store['vocab-part'], '2');

  // topics render, examples default to original: every Part 2 topic, and every 25th Part 1 topic plus the last
  // (each page load parses all data files, so all 508 Part 1 topics would take a long time)
  const pages = P2.map(k => ['2', k]).concat(P1.filter((k, i) => i % 25 === 0 || i === P1.length - 1).map(k => ['1', k]));
  for (const [part, k] of pages) {
    const t = await load(`topic.html?topic=${k}${part === '1' ? '&part=1' : ''}`);
    const topic = (part === '1' ? t.VOCAB_DATA_PART1 : t.VOCAB_DATA)[k], name = `Part ${part} ${k}`;
    const entries = t.document.querySelectorAll('.entry');
    assert.strictEqual(entries.length, topic.words.length, name);
    assert.strictEqual(t.document.getElementById('topic-title').textContent, topic.title, name);
    assert.deepStrictEqual([...t.document.querySelectorAll('.level-btn')].map(b => b.textContent), ['A', 'B', 'C']);
    assert.strictEqual(entries[0].querySelectorAll('.status-btn').length, 3);
    assert.strictEqual(entries[0].querySelectorAll('.today-btn').length, 1);
    assert.strictEqual(entries[0].querySelectorAll('.last-btn').length, 1);
    assert.ok(entries[0].querySelector('.dict-link').href.startsWith('https://www.oxfordlearnersdictionaries.com/search/english/?q='));
    assert.strictEqual(entries[0].querySelector('.entry-ex').textContent, topic.words[0].ex, name);
    // sequence number in the top-right corner: 1…n in topic order, one per card, hidden from screen readers
    const nos = [...entries].map(e => e.querySelectorAll('.entry-no'));
    assert.ok(nos.every(n => n.length === 1), name + ': one number per card');
    assert.deepStrictEqual(nos.map(n => n[0].textContent), topic.words.map((x, i) => String(i + 1)), name);
    assert.strictEqual(entries[0].firstElementChild.className, 'entry-no');
    assert.strictEqual(entries[0].querySelector('.entry-no').getAttribute('aria-hidden'), 'true');
  }
  // Part 1 examples follow the level buttons too
  w = await load('topic.html?topic=0001&part=1');
  w.document.querySelector('.level-btn[data-level="C"]').click();
  { const it = w.VOCAB_DATA_PART1['0001'].words[0];
    assert.deepStrictEqual(exTexts(w.document.querySelector('.entry')), w.VOCAB_EXAMPLES_PART1['0001'][it.w].slice(4, 6)); }
  w.document.querySelector('.level-btn[data-level="C"]').click();
  assert.strictEqual(store['vocab-level'], '[]');

  // Level buttons live in the nav row, directly before the Random button
  { const d = (await load('topic.html?topic=0002')).document;
    const bar = d.getElementById('level-bar'), rnd = d.querySelector('nav [data-random-word]');
    assert.ok(bar.closest('nav') && bar.parentElement === rnd.parentElement, 'same row as Random');
    assert.strictEqual(bar.nextElementSibling, rnd);
    assert.ok(!d.querySelector('header .level-bar'), 'removed from header'); }

  // CEFR level groups (A = A1 + A2, B = B1 + B2, C = C1 + C2): independent on/off buttons, any combination
  w = await load('topic.html?topic=0004');
  const first = w.VOCAB_DATA['0004'].words[0], set = w.VOCAB_EXAMPLES['0004'][first.w];
  const card = () => w.document.querySelector('.entry');
  const tags = () => [...card().querySelectorAll('.ex-lv')].map(e => e.textContent);
  const lvBtn = g => w.document.querySelector(`.level-btn[data-level="${g}"]`);
  const activeGroups = () => [...w.document.querySelectorAll('.level-btn.active')].map(b => b.dataset.level);
  const count = () => w.document.getElementById('count').textContent;
  // one group
  lvBtn('B').click();
  assert.deepStrictEqual(activeGroups(), ['B']);
  assert.strictEqual(lvBtn('B').getAttribute('aria-pressed'), 'true');
  assert.deepStrictEqual(exTexts(card()), [set[2], set[3]]);
  assert.deepStrictEqual(tags(), ['B1', 'B2']);
  assert.match(count(), / · B1 \+ B2 examples$/);
  assert.strictEqual(store['vocab-level'], '["B"]');
  // reload: persisted
  w = await load('topic.html?topic=0004');
  assert.deepStrictEqual(activeGroups(), ['B']);
  assert.deepStrictEqual(exTexts(card()), [set[2], set[3]]);
  // B off, then C on, then A on: A + C shows A1, A2, C1, C2 (always in A1 → C2 order)
  lvBtn('B').click();
  assert.deepStrictEqual(activeGroups(), []);
  assert.deepStrictEqual(exTexts(card()), [first.ex]);
  lvBtn('C').click();
  assert.deepStrictEqual(activeGroups(), ['C']);
  assert.deepStrictEqual(exTexts(card()), [set[4], set[5]]);
  lvBtn('A').click();
  assert.deepStrictEqual(activeGroups(), ['A', 'C']);
  assert.strictEqual(lvBtn('B').getAttribute('aria-pressed'), 'false');
  assert.deepStrictEqual(exTexts(card()), [set[0], set[1], set[4], set[5]]);
  assert.deepStrictEqual(tags(), ['A1', 'A2', 'C1', 'C2']);
  assert.match(count(), / · A1 \+ A2 \+ C1 \+ C2 examples$/);
  assert.strictEqual(store['vocab-level'], '["A","C"]');
  w = await load('topic.html?topic=0004');                 // the combination is persisted
  assert.deepStrictEqual(activeGroups(), ['A', 'C']);
  assert.deepStrictEqual(tags(), ['A1', 'A2', 'C1', 'C2']);
  // all three
  lvBtn('B').click();
  assert.deepStrictEqual(activeGroups(), ['A', 'B', 'C']);
  assert.deepStrictEqual(exTexts(card()), set.slice(0, 6));
  assert.deepStrictEqual(tags(), ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
  // turning one off keeps the others
  lvBtn('A').click();
  assert.deepStrictEqual(activeGroups(), ['B', 'C']);
  assert.deepStrictEqual(tags(), ['B1', 'B2', 'C1', 'C2']);
  // all off -> original example, no level in the count line
  lvBtn('B').click(); lvBtn('C').click();
  assert.deepStrictEqual(activeGroups(), []);
  assert.deepStrictEqual(exTexts(card()), [first.ex]);
  assert.deepStrictEqual(tags(), []);
  assert.doesNotMatch(count(), /examples/);
  assert.strictEqual(store['vocab-level'], '[]');

  // values saved by older versions: one group ("B") or one level ("B2") open that group;
  // unknown or broken values are ignored
  for (const [saved, want] of [['"B"', ['B']], ['"B2"', ['B']], ['["C","A","Z9",5]', ['A', 'C']], ['null', []], ['{"x":1}', []]]) {
    store['vocab-level'] = saved;
    w = await load('topic.html?topic=0004');
    assert.deepStrictEqual(activeGroups(), want, saved);
  }
  assert.deepStrictEqual(exTexts(card()), [first.ex]);      // last case: nothing on -> original example

  // search still works with a level group active
  w.document.querySelector('.level-btn[data-level="A"]').click();
  const s = w.document.getElementById('search'); s.value = 'cramped'; s.dispatchEvent(new w.Event('input'));
  assert.strictEqual(w.document.querySelectorAll('.entry').length, 1);
  assert.deepStrictEqual(exTexts(card()), w.VOCAB_EXAMPLES['0004']['cramped'].slice(0, 2));
  // the sequence number is the word's position in the topic, kept while searching
  { const pos = w.VOCAB_DATA['0004'].words.findIndex(x => x.w === 'cramped') + 1;
    assert.ok(pos > 1, 'cramped is not the first word, so a renumbered list would show 1');
    assert.strictEqual(card().querySelector('.entry-no').textContent, String(pos));
    s.value = 'train'; s.dispatchEvent(new w.Event('input'));             // two matches (words 6 and 10): each keeps its own number
    const shown = [...w.document.querySelectorAll('.entry')];
    assert.deepStrictEqual(shown.map(c => c.querySelector('.entry-no').textContent), ['6', '10']);
    const words = w.VOCAB_DATA['0004'].words;
    for (const c of shown)
      assert.strictEqual(c.querySelector('.entry-no').textContent, String(words.findIndex(x => '0004|' + x.w === c.dataset.id) + 1));
    s.value = 'cramped'; s.dispatchEvent(new w.Event('input')); }

  // learning status: set, persist, survive search re-render, switch, clear
  let e = w.document.querySelector('.entry');
  e.querySelector('[data-status="weak"]').click();
  assert.ok(e.classList.contains('is-weak'));
  s.value=''; s.dispatchEvent(new w.Event('input'));
  w = await load('topic.html?topic=0004');
  e = [...w.document.querySelectorAll('.entry')].find(x => x.dataset.id === '0004|cramped');
  assert.ok(e.querySelector('[data-status="weak"]').classList.contains('active'));
  e.querySelector('[data-status="memorized"]').click();
  assert.ok(e.classList.contains('is-memorized') && !e.classList.contains('is-weak'));
  assert.strictEqual(JSON.parse(store['vocab-status'])['0004|cramped'], 'memorized');
  e.querySelector('[data-status="memorized"]').click();       // click again clears
  assert.ok(!('0004|cramped' in JSON.parse(store['vocab-status'])));

  // theme toggle unaffected
  const before = w.document.documentElement.getAttribute('data-theme');
  w.document.getElementById('theme-toggle').click();
  assert.notStrictEqual(store['vocab-theme'], before);
  assert.strictEqual(w.document.documentElement.getAttribute('data-theme'), store['vocab-theme']);

  // corrupt storage must not break the page
  store['vocab-status'] = '{bad'; store['vocab-level'] = '"Z9"';
  w = await load('topic.html?topic=0001');
  assert.strictEqual(w.document.querySelector('.entry-ex').textContent, w.VOCAB_DATA['0001'].words[0].ex);
  // ---- Random word (index + topic pages) ----
  for (const page of ['index.html', 'topic.html?topic=0003']) {
    store['vocab-level'] = 'null';
    w = await load(page);
    const d = w.document, btn = d.querySelector('[data-random-word]');
    assert.ok(btn, 'random button on ' + page);
    const total = [w.VOCAB_DATA, w.VOCAB_DATA_PART1].reduce((n, D) => n + Object.values(D).reduce((m, t) => m + t.words.length, 0), 0);
    assert.strictEqual(total, 14086);
    assert.strictEqual(w.VocabRandom.poolSize, total);
    const seen = new Set(), parts = new Set(); let prev = null;
    for (let n = 0; n < 400; n++) {
      if (n === 0) btn.click(); else d.getElementById('rw-next').click();
      assert.ok(d.querySelector('.rw-backdrop').classList.contains('open'));
      const e = rwEntry(w), here = `${e.part}|${e.k}|${e.it.w}`;
      assert.notStrictEqual(here, prev, 'no immediate repeat'); prev = here;
      seen.add(e.part + '|' + e.k); parts.add(e.part);
      assert.strictEqual(d.getElementById('rw-topic').textContent, `Part ${e.part} · ${e.k} · ${e.title}`);
      assert.strictEqual(d.getElementById('rw-ipa').textContent, e.it.ipa);
      assert.strictEqual(d.getElementById('rw-pos').textContent, e.it.p);
      assert.strictEqual(d.getElementById('rw-uz').textContent, e.it.tr || e.it.def);
      const en = d.getElementById('rw-en');
      if (e.it.tr) assert.strictEqual(en.textContent, e.it.def);
      else assert.ok(en.querySelector('a').href.includes('oxfordlearnersdictionaries.com'));
      assert.strictEqual(d.getElementById('rw-ex').textContent, e.it.ex);
      assert.strictEqual(d.getElementById('rw-topic').getAttribute('href'), `topic.html?topic=${e.k}${e.part === '1' ? '&part=1' : ''}`);
    }
    // 400 picks from 588 topics: both parts and many different topics (Part 2 alone has only 80)
    assert.deepStrictEqual([...parts].sort(), ['1', '2'], 'words come from both parts');
    assert.ok(seen.size > 100, 'words come from many topics: ' + seen.size);
    // Escape closes
    d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape' }));
    assert.ok(!d.querySelector('.rw-backdrop').classList.contains('open'));
  }
  // Respects the saved CEFR level groups (any combination; older single values map to their group)
  for (const [saved, idx, label] of [
    ['["B"]', [2, 3], 'B1 + B2'], ['"B"', [2, 3], 'B1 + B2'], ['"B2"', [2, 3], 'B1 + B2'],
    ['["A","C"]', [0, 1, 4, 5], 'A1 + A2 + C1 + C2'], ['["A","B","C"]', [0, 1, 2, 3, 4, 5], 'A1 + A2 + B1 + B2 + C1 + C2']]) {
    store['vocab-level'] = saved;
    w = await load('index.html');
    w.document.querySelector('[data-random-word]').click();
    const e = rwEntry(w);
    assert.deepStrictEqual(exTexts(w.document.getElementById('rw-ex')), idx.map(i => e.set[i]), saved);
    assert.deepStrictEqual([...w.document.querySelectorAll('#rw-ex .rw-lv')].map(e => e.textContent), label.split(' + '), saved);
    assert.strictEqual(w.document.getElementById('rw-ex-label').textContent, 'Example · ' + label);
  }
  // Backdrop click closes
  w.document.querySelector('.rw-backdrop').click();
  assert.ok(!w.document.querySelector('.rw-backdrop').classList.contains('open'));

  // ---- Today list ----
  const today = () => JSON.parse(store['vocab-today'] || '[]');
  // Topic page: "☆ Today" after "Need to Learn" toggles the word in the list, separate from the status
  store['vocab-today'] = '[]'; store['vocab-status'] = '{}'; store['vocab-level'] = 'null';
  w = await load('topic.html?topic=0004');
  let cards = [...w.document.querySelectorAll('.entry')];
  const ids = cards.map(c => c.dataset.id);
  for (const c of cards) {
    const btns = [...c.querySelectorAll('.status-group button')];
    assert.deepStrictEqual(btns.map(b => b.textContent), ['Memorized', 'Weak', 'Need to Learn', '☆ Today', '⤓ Last word']);
  }
  const tbtn = i => cards[i].querySelector('.today-btn');
  tbtn(0).click(); tbtn(2).click();
  assert.deepStrictEqual(today(), [ids[0], ids[2]]);
  assert.strictEqual(tbtn(0).textContent, '★ Today');
  assert.strictEqual(tbtn(0).getAttribute('aria-pressed'), 'true');
  assert.ok(tbtn(0).classList.contains('active'));
  tbtn(3).click(); tbtn(3).click();                          // on, then off again
  assert.deepStrictEqual(today(), [ids[0], ids[2]]);
  assert.strictEqual(tbtn(3).textContent, '☆ Today');
  assert.strictEqual(tbtn(3).getAttribute('aria-pressed'), 'false');
  cards[0].querySelector('[data-status="weak"]').click();     // status and Today are independent
  assert.ok(cards[0].classList.contains('is-weak') && tbtn(0).classList.contains('active'));
  assert.deepStrictEqual(today(), [ids[0], ids[2]]);
  const ss = w.document.getElementById('search'); ss.value = 'xyz-nothing'; ss.dispatchEvent(new w.Event('input'));
  ss.value = ''; ss.dispatchEvent(new w.Event('input'));         // survives a re-render
  cards = [...w.document.querySelectorAll('.entry')];
  assert.ok(tbtn(0).classList.contains('active') && tbtn(2).classList.contains('active') && !tbtn(1).classList.contains('active'));
  w = await load('topic.html?topic=0004');                     // persisted
  cards = [...w.document.querySelectorAll('.entry')];
  assert.ok(tbtn(0).classList.contains('active') && tbtn(2).classList.contains('active'));
  store['vocab-today'] = '[]';                                 // changed on the main page -> refreshed on return
  w.dispatchEvent(new w.Event('pageshow'));
  assert.ok(!tbtn(0).classList.contains('active'));
  tbtn(0).click(); tbtn(2).click();
  assert.deepStrictEqual(today(), [ids[0], ids[2]]);

  // Main page: "★ Today (N)" opens the list
  store['vocab-level'] = '["B"]';
  w = await load('index.html');
  let d = w.document;
  const openBtn = d.getElementById('today-open'), panel = d.querySelector('.td-backdrop');
  assert.ok(openBtn, 'Today button on the main page');
  assert.strictEqual(openBtn.querySelector('.today-count').textContent, '(2)');
  assert.ok(!panel.classList.contains('open'));
  openBtn.click();
  assert.ok(panel.classList.contains('open'));
  assert.strictEqual(d.getElementById('td-n').textContent, '2 words');
  let items = [...d.querySelectorAll('.td-item')];
  assert.deepStrictEqual(items.map(i => i.dataset.id), [ids[0], ids[2]]);
  const w0 = w.VOCAB_DATA['0004'].words.find(x => '0004|' + x.w === ids[0]);
  assert.strictEqual(items[0].querySelector('.td-word').textContent, w0.w);
  assert.strictEqual(items[0].querySelector('.td-word').getAttribute('href'), `topic.html?topic=0004&q=${encodeURIComponent(w0.w)}`);
  assert.strictEqual(items[0].querySelector('.td-uz').textContent, w0.tr || w0.def);
  assert.deepStrictEqual([...items[0].querySelectorAll('.td-ex .t')].map(e => e.textContent), w.VOCAB_EXAMPLES['0004'][w0.w].slice(2, 4));
  assert.deepStrictEqual([...items[0].querySelectorAll('.td-ex .lv')].map(e => e.textContent), ['B1', 'B2']);

  // A + C on: the list shows A1, A2, C1, C2
  store['vocab-level'] = '["A","C"]';
  d.getElementById('td-close').click(); openBtn.click();
  items = [...d.querySelectorAll('.td-item')];
  assert.deepStrictEqual([...items[0].querySelectorAll('.td-ex .lv')].map(e => e.textContent), ['A1', 'A2', 'C1', 'C2']);
  assert.deepStrictEqual([...items[0].querySelectorAll('.td-ex .t')].map(e => e.textContent),
    [0, 1, 4, 5].map(i => w.VOCAB_EXAMPLES['0004'][w0.w][i]));

  // Today window: A / B / C buttons (same "vocab-level" setting as the topic pages, any combination)
  const tdLv = g => d.querySelector(`.td-lv[data-level="${g}"]`);
  const tdOn = () => [...d.querySelectorAll('.td-lv.active')].map(b => b.dataset.level);
  const tdTags = () => [...d.querySelector('.td-item').querySelectorAll('.td-ex .lv')].map(e => e.textContent);
  const ex0 = w.VOCAB_EXAMPLES['0004'][w0.w];
  assert.deepStrictEqual([...d.querySelectorAll('#td-levels .td-lv')].map(b => b.textContent), ['A', 'B', 'C']);
  assert.deepStrictEqual(tdOn(), ['A', 'C']);                           // shows the saved setting
  assert.strictEqual(tdLv('A').getAttribute('aria-pressed'), 'true');
  assert.strictEqual(tdLv('B').getAttribute('aria-pressed'), 'false');
  tdLv('B').click();                                                    // A + B + C
  assert.deepStrictEqual(tdOn(), ['A', 'B', 'C']);
  assert.strictEqual(store['vocab-level'], '["A","B","C"]');
  assert.deepStrictEqual(tdTags(), ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
  assert.deepStrictEqual([...d.querySelector('.td-item').querySelectorAll('.td-ex .t')].map(e => e.textContent), ex0.slice(0, 6));
  tdLv('A').click(); tdLv('C').click();                                 // B only
  assert.deepStrictEqual(tdOn(), ['B']);
  assert.strictEqual(store['vocab-level'], '["B"]');
  assert.deepStrictEqual(tdTags(), ['B1', 'B2']);
  tdLv('B').click();                                                    // all off -> original example
  assert.deepStrictEqual(tdOn(), []);
  assert.strictEqual(store['vocab-level'], '[]');
  assert.deepStrictEqual(tdTags(), []);
  assert.deepStrictEqual([...d.querySelector('.td-item').querySelectorAll('.td-ex')].map(e => e.textContent), [w0.ex]);
  tdLv('C').click(); tdLv('A').click();                                 // order of clicks does not matter
  assert.deepStrictEqual(tdOn(), ['A', 'C']);
  assert.strictEqual(store['vocab-level'], '["A","C"]');
  assert.deepStrictEqual(tdTags(), ['A1', 'A2', 'C1', 'C2']);
  assert.strictEqual(d.querySelectorAll('.td-item').length, 2);         // the list itself is unchanged
  assert.deepStrictEqual(today(), [ids[0], ids[2]]);

  // Today window: Memorized / Weak / Need to Learn on each word (same "vocab-status" as the topic pages)
  const tdItem = id => [...d.querySelectorAll('.td-item')].find(i => i.dataset.id === id);
  const tdStatus = id => {
    const it = tdItem(id), on = [...it.querySelectorAll('.td-st.active')].map(b => b.dataset.status);
    const cls = ['memorized', 'weak', 'learn'].filter(k => it.classList.contains('is-' + k));
    assert.deepStrictEqual(cls, on, 'border class matches the active button');
    return on[0] || null;
  };
  const tdSt = (id, k) => tdItem(id).querySelector(`.td-st[data-status="${k}"]`);
  for (const it of d.querySelectorAll('.td-item'))
    assert.deepStrictEqual([...it.querySelectorAll('.td-st')].map(b => b.textContent), ['Memorized', 'Weak', 'Need to Learn']);
  assert.strictEqual(tdStatus(ids[0]), 'weak');                         // set on the topic page earlier
  assert.strictEqual(tdSt(ids[0], 'weak').getAttribute('aria-pressed'), 'true');
  assert.strictEqual(tdStatus(ids[2]), null);
  tdSt(ids[0], 'memorized').click();                                    // switch weak -> memorized
  assert.strictEqual(tdStatus(ids[0]), 'memorized');
  assert.strictEqual(tdSt(ids[0], 'weak').getAttribute('aria-pressed'), 'false');
  assert.strictEqual(JSON.parse(store['vocab-status'])[ids[0]], 'memorized');
  tdSt(ids[0], 'memorized').click();                                    // click again clears
  assert.strictEqual(tdStatus(ids[0]), null);
  assert.ok(!(ids[0] in JSON.parse(store['vocab-status'])));
  tdSt(ids[0], 'memorized').click();
  tdSt(ids[2], 'learn').click();
  assert.strictEqual(tdStatus(ids[0]), 'memorized');
  assert.strictEqual(tdStatus(ids[2]), 'learn');
  assert.deepStrictEqual(JSON.parse(store['vocab-status']), { [ids[0]]: 'memorized', [ids[2]]: 'learn' });
  tdLv('B').click(); tdLv('B').click();                                 // kept when the list is redrawn
  assert.strictEqual(tdStatus(ids[0]), 'memorized');
  assert.strictEqual(tdStatus(ids[2]), 'learn');
  d.getElementById('td-close').click(); openBtn.click();                // and when it is opened again
  assert.strictEqual(tdStatus(ids[0]), 'memorized');
  assert.strictEqual(tdStatus(ids[2]), 'learn');
  assert.deepStrictEqual(today(), [ids[0], ids[2]]);                    // status buttons do not change the list
  items = [...d.querySelectorAll('.td-item')];                          // the list was redrawn

  // Copy URL: a link to this page with ?today=id~id
  d.getElementById('td-copy').click();
  assert.ok(!d.getElementById('td-share').hidden);
  const link = d.getElementById('td-url').value;
  assert.ok(link.endsWith('/index.html?today=' + [ids[0], ids[2]].map(encodeURIComponent).join('~')), link);

  // Remove one word
  items[1].querySelector('.td-remove').click();
  assert.deepStrictEqual(today(), [ids[0]]);
  assert.strictEqual(openBtn.querySelector('.today-count').textContent, '(1)');
  assert.strictEqual(d.querySelectorAll('.td-item').length, 1);

  // Clear asks first; Cancel keeps the list, OK empties it
  w.confirm = () => false; d.getElementById('td-clear').click();
  assert.deepStrictEqual(today(), [ids[0]]);
  w.confirm = () => true;  d.getElementById('td-clear').click();
  assert.deepStrictEqual(today(), []);
  assert.strictEqual(openBtn.querySelector('.today-count').textContent, '');
  assert.strictEqual(d.querySelectorAll('.td-item').length, 0);
  assert.ok(d.querySelector('.td-empty'));
  assert.ok(d.getElementById('td-copy').disabled && d.getElementById('td-clear').disabled);

  // Escape closes
  d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape' }));
  assert.ok(!panel.classList.contains('open'));

  // What was set in the Today window shows on the topic page: levels A + C, the two statuses
  { const t = await load('topic.html?topic=0004');
    assert.deepStrictEqual([...t.document.querySelectorAll('.level-btn.active')].map(b => b.dataset.level), ['A', 'C']);
    const entry = id => [...t.document.querySelectorAll('.entry')].find(e => e.dataset.id === id);
    assert.ok(entry(ids[0]).classList.contains('is-memorized'));
    assert.ok(entry(ids[0]).querySelector('[data-status="memorized"]').classList.contains('active'));
    assert.ok(entry(ids[2]).classList.contains('is-learn'));
    assert.ok(entry(ids[2]).querySelector('[data-status="learn"]').classList.contains('active')); }

  // Opening a copied link on another device (empty list): saved without asking, list opened, ?today= removed
  const q = '?today=' + [ids[0], ids[2], '9999|no such word'].map(encodeURIComponent).join('~');
  store['vocab-today'] = '[]';
  let asked = 0;
  w = await load('index.html' + q, win => { win.confirm = () => { asked++; return true; }; });
  assert.strictEqual(asked, 0);
  assert.deepStrictEqual(today(), [ids[0], ids[2]]);           // unknown words are dropped
  assert.ok(w.document.querySelector('.td-backdrop').classList.contains('open'));
  assert.ok(!w.location.search.includes('today='));
  // Device that already has a list: OK replaces it, Cancel adds the shared words
  store['vocab-today'] = JSON.stringify([ids[1]]);
  w = await load('index.html' + q, win => { win.confirm = () => { asked++; return true; }; });
  assert.strictEqual(asked, 1);
  assert.deepStrictEqual(today(), [ids[0], ids[2]]);
  store['vocab-today'] = JSON.stringify([ids[2], ids[1]]);
  w = await load('index.html' + q, win => { win.confirm = () => false; });
  assert.deepStrictEqual(today(), [ids[2], ids[1], ids[0]]);
  // Corrupt storage must not break either page
  store['vocab-today'] = '{bad';
  w = await load('index.html');
  assert.strictEqual(w.document.querySelector('#today-open .today-count').textContent, '');
  w = await load('topic.html?topic=0004');
  w.document.querySelector('.today-btn').click();
  assert.deepStrictEqual(today(), [w.document.querySelector('.entry').dataset.id]);

  // ---- Last word: one word you mark yourself (saved in "vocab-last" as the word id) ----
  delete store['vocab-last']; store['vocab-level'] = '[]';
  // Main page with nothing marked: the button is there but disabled
  w = await load('index.html');
  { const lb = w.document.getElementById('last-word');
    assert.ok(lb, 'Last word button on the main page');
    assert.strictEqual(lb.textContent, '⤓ Last word');
    assert.strictEqual(lb.previousElementSibling, w.document.getElementById('today-open'), 'right after Today');
    assert.ok(lb.disabled);
    assert.match(lb.title, /^No Last word yet/);
    assert.strictEqual(w.VocabLast.get(), null); }

  // Topic page: "⤓ Last word" on every card, right after "☆ Today"
  w = await load('topic.html?topic=0004');
  const lwCards = () => [...w.document.querySelectorAll('.entry')];
  const lwBtn = i => lwCards()[i].querySelector('.last-btn');
  const lwId = i => lwCards()[i].dataset.id;
  const lwMarked = () => [...w.document.querySelectorAll('.entry-last')].map(m => m.closest('.entry').dataset.id);
  const lwPressed = () => lwCards().filter(c => c.querySelector('.last-btn').classList.contains('active')).map(c => c.dataset.id);
  for (const c of lwCards()) {
    const b = c.querySelector('.last-btn');
    assert.strictEqual(b.textContent, '⤓ Last word');
    assert.ok(b.previousElementSibling.classList.contains('today-btn'));
    assert.strictEqual(b.getAttribute('aria-pressed'), 'false');
  }
  assert.deepStrictEqual(lwMarked(), []);
  const todayBefore = store['vocab-today'], statusBefore = store['vocab-status'];
  // mark a word
  lwBtn(3).click();
  assert.strictEqual(store['vocab-last'], JSON.stringify(lwId(3)));
  assert.deepStrictEqual(lwMarked(), [lwId(3)]);
  assert.deepStrictEqual(lwPressed(), [lwId(3)]);
  assert.strictEqual(lwBtn(3).getAttribute('aria-pressed'), 'true');
  assert.strictEqual(lwCards()[3].querySelector('.entry-last').textContent, '⤓ Last word');
  assert.strictEqual(lwCards()[3].querySelector('.entry-last').previousElementSibling.className, 'entry-ipa');
  // marking another word moves the mark (only one Last word)
  lwBtn(7).click();
  assert.strictEqual(store['vocab-last'], JSON.stringify(lwId(7)));
  assert.deepStrictEqual(lwMarked(), [lwId(7)]);
  assert.deepStrictEqual(lwPressed(), [lwId(7)]);
  assert.strictEqual(lwBtn(3).getAttribute('aria-pressed'), 'false');
  // clicking the marked word again removes the mark
  lwBtn(7).click();
  assert.strictEqual(store['vocab-last'], undefined);
  assert.deepStrictEqual(lwMarked(), []);
  assert.deepStrictEqual(lwPressed(), []);
  // mark the word that the rest of the test uses; Today list and statuses are not touched
  lwBtn(5).click();
  const lwWord = w.VOCAB_DATA['0004'].words.find(x => '0004|' + x.w === lwId(5)).w, lwKeep = lwId(5);
  assert.strictEqual(store['vocab-today'], todayBefore);
  assert.strictEqual(store['vocab-status'], statusBefore);
  // kept when the cards are redrawn (level button, search)
  w.document.querySelector('.level-btn[data-level="A"]').click();
  assert.deepStrictEqual(lwMarked(), [lwKeep]);
  w.document.querySelector('.level-btn[data-level="A"]').click();
  const ls = w.document.getElementById('search');
  ls.value = 'xyz-nothing'; ls.dispatchEvent(new w.Event('input'));
  assert.deepStrictEqual(lwMarked(), []);
  ls.value = ''; ls.dispatchEvent(new w.Event('input'));
  assert.deepStrictEqual(lwMarked(), [lwKeep]);
  // saved: still marked after a reload
  w = await load('topic.html?topic=0004');
  assert.deepStrictEqual(lwMarked(), [lwKeep]);
  assert.deepStrictEqual(lwPressed(), [lwKeep]);
  // other topics show no mark
  w = await load('topic.html?topic=0003');
  assert.deepStrictEqual(lwMarked(), []);

  // Main page: the button is enabled and opens the marked word
  w = await load('index.html');
  { const lb = w.document.getElementById('last-word'), L = w.VocabLast.get();
    assert.ok(!lb.disabled);
    assert.strictEqual(lb.title, `Go to your Last word: "${lwWord}" (Part 2 · 0004 · ${w.VOCAB_DATA['0004'].title})`);
    assert.deepStrictEqual([L.id, L.part, L.topicKey, L.w], [lwKeep, '2', '0004', lwWord]);
    assert.strictEqual(L.url, `topic.html?topic=0004&word=${encodeURIComponent(lwWord)}`);
    // the link: the whole topic, the marked word picked out
    w = await load(L.url);
    assert.strictEqual(lwCards().length, w.VOCAB_DATA['0004'].words.length, 'whole topic shown, not filtered');
    assert.strictEqual(w.document.getElementById('search').value, '');
    assert.deepStrictEqual(lwMarked(), [lwKeep]);
    assert.deepStrictEqual([...w.document.querySelectorAll('.entry.is-target')].map(e => e.dataset.id), [lwKeep]); }

  // Marking a word in another topic (here Part 1) moves the mark there
  w = await load('topic.html?topic=0001&part=1');
  lwBtn(2).click();
  const p1Id = lwId(2), p1Word = w.VOCAB_DATA_PART1['0001'].words[2].w;
  assert.strictEqual(p1Id, 'p1:0001|' + p1Word);
  assert.strictEqual(store['vocab-last'], JSON.stringify(p1Id));
  w = await load('index.html');
  assert.strictEqual(w.VocabLast.get().url, `topic.html?topic=0001&part=1&word=${encodeURIComponent(p1Word)}`);
  assert.match(w.document.getElementById('last-word').title, / \(Part 1 · 0001 · /);
  w = await load('topic.html?topic=0004');
  assert.deepStrictEqual(lwMarked(), []);
  // changed on another page -> refreshed when coming back to this one
  store['vocab-last'] = JSON.stringify(lwKeep);
  w.dispatchEvent(new w.Event('pageshow'));
  assert.deepStrictEqual(lwMarked(), [lwKeep]);
  w = await load('index.html');
  delete store['vocab-last'];
  w.dispatchEvent(new w.Event('pageshow'));
  assert.ok(w.document.getElementById('last-word').disabled);

  // A saved word that no longer exists, or a broken value: nothing marked, button disabled, no errors
  for (const bad of ['"0004|no such word"', '"9999|x"', '"bogus"', '{bad', '42']) {
    store['vocab-last'] = bad;
    w = await load('index.html');
    assert.ok(w.document.getElementById('last-word').disabled, bad);
    assert.strictEqual(w.VocabLast.get(), null, bad);
    w = await load('topic.html?topic=0004');
    assert.deepStrictEqual(lwMarked(), [], bad);
  }
  delete store['vocab-last'];

  // ---- Synonym / opposite details popup (word-info.js) ----
  store['vocab-related'] = 'on'; store['vocab-today'] = JSON.stringify(['0004|get around', '0004|unreliable']);
  w = await load('topic.html?topic=0004');
  { const d = w.document;
    // independent lookup: lower-case word -> entries from Part 1 and Part 2
    const idx = {};
    [['1', w.VOCAB_DATA_PART1], ['2', w.VOCAB_DATA]].forEach(([part, D]) => Object.keys(D).forEach(k => D[k].words.forEach(it =>
      (idx[it.w.toLowerCase()] = idx[it.w.toLowerCase()] || []).push({ part, k, title: D[k].title, it }))));
    const known = x => !!idx[x.toLowerCase()];
    // every card: exactly the synonyms/opposites with an entry are links, the others plain text, same order
    let links = 0, plain = 0;
    for (const c of d.querySelectorAll('.entry')) {
      const item = w.VOCAB_DATA['0004'].words.find(x => '0004|' + x.w === c.dataset.id), rel = w.adjRelated(item);
      const r = c.querySelector('.entry-related');
      if (!rel) { assert.ok(!r); continue; }
      const bs = [...r.querySelectorAll('b')];
      const lists = [rel.syn, rel.ant].filter(l => l.length);
      assert.strictEqual(bs.length, lists.length);
      lists.forEach((l, i) => {
        assert.strictEqual(bs[i].textContent, l.join(', '), 'text unchanged');
        const ls = [...bs[i].querySelectorAll('.wi-link')];
        assert.deepStrictEqual(ls.map(b => b.textContent), l.filter(known));
        ls.forEach(b => {
          assert.strictEqual(b.tagName, 'BUTTON');
          assert.strictEqual(b.dataset.of, item.w);
          assert.strictEqual(b.dataset.ofp, item.p);
        });
        links += ls.length; plain += l.length - ls.length;
      });
    }
    assert.ok(links > 0 && plain > 0, `links ${links}, plain ${plain}`);

    // click "move around" on the "get around" card
    const ga = [...d.querySelectorAll('.entry')].find(e => e.dataset.id === '0004|get around');
    const gaRel = w.adjRelated(w.VOCAB_DATA['0004'].words.find(x => x.w === 'get around'));
    const pop = d.querySelector('.wi-backdrop');
    assert.ok(!pop.classList.contains('open'));
    const link = [...ga.querySelectorAll('.wi-link')].find(b => b.textContent === 'move around');
    assert.ok(link, '"move around" is a link');
    link.click();
    assert.ok(pop.classList.contains('open'));
    assert.strictEqual(d.getElementById('wi-title').textContent, 'get around');
    const secs = [...pop.querySelectorAll('.wi-sec')].map(x => x.textContent);
    assert.deepStrictEqual(secs, [gaRel.syn.some(known) && 'Synonyms', gaRel.ant.some(known) && 'Opposites'].filter(Boolean));
    assert.deepStrictEqual([...pop.querySelectorAll('.wi-word')].map(x => x.dataset.w), gaRel.syn.filter(known).concat(gaRel.ant.filter(known)));
    assert.deepStrictEqual([...pop.querySelectorAll('.wi-current')].map(x => x.dataset.w), ['move around']);
    // each word: its distinct meanings (Part 1 + Part 2) with UZ translation, EN explanation and source
    for (const row of pop.querySelectorAll('.wi-word')) {
      const word = row.dataset.w;
      assert.strictEqual(row.querySelector('.wi-w').textContent, word);
      const want = [], seen = new Set();
      for (const e of idx[word.toLowerCase()]) {
        const tr = e.it.tr || e.it.def, def = e.it.tr ? e.it.def : '', key = [e.it.p, def, tr].join('|');
        if (seen.has(key)) { want.find(m => m.key === key).n++; continue; }
        seen.add(key); want.push({ key, p: e.it.p, tr, def, e, n: 1 });
      }
      const ms = [...row.querySelectorAll('.wi-m')];
      assert.strictEqual(ms.length, want.length, word);
      ms.forEach((m, i) => {
        const x = want[i];
        assert.strictEqual(m.querySelector('.wi-pos').textContent, x.p);
        assert.strictEqual(m.querySelector('.wi-tr').textContent, x.tr);
        assert.strictEqual(m.querySelector('.wi-def') ? m.querySelector('.wi-def').textContent : '', x.def);
        const a = m.querySelector('.wi-src a');
        assert.strictEqual(a.getAttribute('href'), `topic.html?topic=${x.e.k}${x.e.part === '1' ? '&part=1' : ''}&word=${encodeURIComponent(x.e.it.w)}`);
        assert.strictEqual(a.textContent, `Part ${x.e.part} · ${x.e.k} · ${x.e.title} ↗`);
        assert.strictEqual(m.querySelector('.wi-src span') ? m.querySelector('.wi-src span').textContent : '',
          x.n > 1 ? `+${x.n - 1} more topic${x.n - 1 === 1 ? '' : 's'}` : '');
      });
    }
    const missing = gaRel.syn.concat(gaRel.ant).filter(x => !known(x));
    assert.strictEqual(pop.querySelector('.wi-none') ? pop.querySelector('.wi-none').textContent : '',
      missing.length ? 'Not in Part 1 or Part 2 yet: ' + missing.join(', ') : '');
    // close: ×, click outside, Escape
    d.getElementById('wi-close').click();
    assert.ok(!pop.classList.contains('open'));
    link.click(); pop.click();
    assert.ok(!pop.classList.contains('open'));
    link.click(); d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    assert.ok(!pop.classList.contains('open'));
    // clicking a word does not change anything else on the card
    assert.strictEqual(store['vocab-last'], undefined);
    assert.deepStrictEqual(JSON.parse(store['vocab-today']), ['0004|get around', '0004|unreliable']);
    // a card with opposites: the clicked opposite is highlighted in the Opposites section
    const withAnt = [...d.querySelectorAll('.entry')].find(e => [...e.querySelectorAll('.entry-related b')].length === 2 && e.querySelectorAll('.entry-related b')[1].querySelector('.wi-link'));
    if (withAnt) {
      const ab = withAnt.querySelectorAll('.entry-related b')[1].querySelector('.wi-link');
      ab.click();
      const cur = pop.querySelector('.wi-current');
      assert.strictEqual(cur.dataset.w, ab.textContent);
      let sec = cur.previousElementSibling; while (sec && !sec.classList.contains('wi-sec')) sec = sec.previousElementSibling;
      assert.strictEqual(sec.textContent, 'Opposites');
      d.getElementById('wi-close').click();
    }
  }
  // Over the Today window and the Random box: Escape / click outside close only the popup
  w = await load('index.html');
  { const d = w.document, pop = d.querySelector('.wi-backdrop'), td = d.querySelector('.td-backdrop'), rw = d.querySelector('.rw-backdrop');
    d.getElementById('today-open').click();
    const tl = d.querySelector('.td-list .wi-link');
    assert.ok(tl, 'links in the Today window');
    tl.click();
    assert.ok(pop.classList.contains('open') && td.classList.contains('open'));
    assert.strictEqual(d.getElementById('wi-title').textContent, w.VOCAB_DATA['0004'].words.find(x => '0004|' + x.w === tl.closest('.td-item').dataset.id).w);
    pop.click();
    assert.ok(!pop.classList.contains('open') && td.classList.contains('open'));
    tl.click();
    d.activeElement.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    assert.ok(!pop.classList.contains('open') && td.classList.contains('open'), 'Escape closes only the popup');
    d.activeElement.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    assert.ok(!td.classList.contains('open'), 'second Escape closes Today');
    let n = 0; do { w.VocabRandom.show(); n++; } while (!d.querySelector('#rw-related .wi-link') && n < 500);
    const rl = d.querySelector('#rw-related .wi-link');
    assert.ok(rl, 'a random word with a clickable synonym/opposite');
    rl.click();
    assert.ok(pop.classList.contains('open') && rw.classList.contains('open'));
    assert.strictEqual(d.getElementById('wi-title').textContent, d.getElementById('rw-word').textContent);
    assert.deepStrictEqual([...pop.querySelectorAll('.wi-current')].map(x => x.dataset.w), [rl.textContent]);
    d.activeElement.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    assert.ok(!pop.classList.contains('open') && rw.classList.contains('open'), 'Escape closes only the popup');
    w.VocabRandom.close();
  }
  store['vocab-today'] = '[]';

  // ---- Extra space where a new level group starts (A → B, B → C): class "ex-grp" on that sentence ----
  { // expected: the levels shown, and which of them start a new group (not the first one)
    const combos = [
      [['A', 'B', 'C'], ['B1', 'C1']], [['A', 'C'], ['C1']], [['A', 'B'], ['B1']], [['B', 'C'], ['C1']],
      [['A'], []], [['B'], []], [['C'], []], [[], []]];
    const lvOf = (el, sel) => [...el.querySelectorAll(sel)].map(e => e.textContent);
    const cssText = d => [...d.querySelectorAll('style')].map(x => x.textContent).join('\n').replace(/\s+/g, ' ');
    // topic page: every card, every combination (buttons clicked, not just saved)
    store['vocab-level'] = '[]';
    w = await load('topic.html?topic=0004');
    assert.match(cssText(w.document), /\.entry-ex\.has-lv ~ \.entry-ex\.has-lv\.ex-grp\{ margin-top: 14px; \}/);
    assert.match(cssText(w.document), /\.entry-ex\.has-lv ~ \.entry-ex\.has-lv\{ margin-top: 6px; \}/);   // within a group: unchanged
    const btn = g => w.document.querySelector(`.level-btn[data-level="${g}"]`);
    let on = [];
    for (const [groups, starts] of combos) {
      for (const g of ['A', 'B', 'C']) if (on.includes(g) !== groups.includes(g)) btn(g).click();
      on = groups;
      assert.strictEqual(store['vocab-level'], JSON.stringify(groups));
      const levels = groups.flatMap(g => [g + '1', g + '2']);
      for (const c of w.document.querySelectorAll('.entry')) {
        const name = groups.join('+') + ' ' + c.dataset.id;
        const exs = [...c.querySelectorAll('.entry-ex')];
        if (!groups.length) { assert.strictEqual(c.querySelectorAll('.ex-grp').length, 0, name); continue; }
        assert.deepStrictEqual(exs.map(e => e.querySelector('.ex-lv').textContent), levels, name);
        assert.deepStrictEqual(exs.filter(e => e.classList.contains('ex-grp')).map(e => e.querySelector('.ex-lv').textContent), starts, name);
        assert.strictEqual(c.querySelectorAll('.ex-grp').length, starts.length, name);   // only on sentences, never on Uzbek lines
      }
    }
    // the original example (all off) and a single group never get the extra space; neither does the first sentence
    btn('A').click(); btn('B').click(); btn('C').click();
    for (const c of w.document.querySelectorAll('.entry'))
      assert.ok(!c.querySelector('.entry-ex').classList.contains('ex-grp'));
    btn('A').click(); btn('B').click(); btn('C').click();
    assert.strictEqual(store['vocab-level'], '[]');

    // Random box: same rule for the saved groups
    for (const [groups, starts] of combos) {
      store['vocab-level'] = JSON.stringify(groups);
      w = await load('index.html');
      if (groups === combos[0][0]) {
        assert.match(cssText(w.document), /\.rw-ex\.has-lv ~ \.rw-ex\.has-lv\.ex-grp\{ margin-top:14px; \}/);
        assert.match(cssText(w.document), /\.td-list \.td-ex\.ex-grp\{ margin-top:13px; \}/);
      }
      w.VocabRandom.show();
      const box = w.document.getElementById('rw-ex');
      assert.deepStrictEqual(lvOf(box, '.rw-lv'), groups.flatMap(g => [g + '1', g + '2']), 'random ' + groups.join('+'));
      assert.deepStrictEqual([...box.querySelectorAll('.ex-grp')].map(e => e.querySelector('.rw-lv').textContent), starts, 'random ' + groups.join('+'));
      w.VocabRandom.close();
    }

    // Today window: its A / B / C buttons
    store['vocab-level'] = '[]'; store['vocab-today'] = JSON.stringify(['0004|get around', '0004|unreliable']);
    w = await load('index.html');
    w.document.getElementById('today-open').click();
    const tdBtn = g => w.document.querySelector(`.td-lv[data-level="${g}"]`);
    on = [];
    for (const [groups, starts] of combos) {
      for (const g of ['A', 'B', 'C']) if (on.includes(g) !== groups.includes(g)) tdBtn(g).click();
      on = groups;
      for (const it of w.document.querySelectorAll('.td-item')) {
        const name = 'today ' + groups.join('+') + ' ' + it.dataset.id;
        assert.deepStrictEqual(lvOf(it, '.td-ex .lv'), groups.flatMap(g => [g + '1', g + '2']), name);
        assert.deepStrictEqual([...it.querySelectorAll('.ex-grp')].map(e => e.querySelector('.lv').textContent), starts, name);
      }
    }
    store['vocab-today'] = '[]';
  }

  console.log('ALL TESTS PASSED');
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
