const { JSDOM, ResourceLoader, VirtualConsole } = require('jsdom');
class Local extends ResourceLoader { fetch(url,o){ return url.startsWith('file:') ? super.fetch(url,o) : null; } }
const vc = new VirtualConsole(); vc.on('jsdomError', e => { if(!/Could not load link/.test(e.message)) console.error(e.message); });
const path = require('path');
const assert = require('assert');
const store = {};               // shared localStorage across page loads
// Text of the example sentences shown in a card (without the A1…C2 level tags).
const exTexts = el => [...el.querySelectorAll('.entry-ex, .rw-ex')].map(e => (e.querySelector('.ex-t, .rw-t') || e).textContent);
async function load(url, setup){
  const dom = await JSDOM.fromFile(path.join(__dirname,'site',url.split('?')[0]), {
    url: 'file://' + path.join(__dirname,'site',url),
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
  // index page still works
  let w = await load('index.html');
  assert.strictEqual(w.document.querySelectorAll('.topic-card').length, 10);

  // every topic renders, examples default to original
  for (const k of Object.keys(w.VOCAB_DATA)) {
    const t = await load(`topic.html?topic=${k}`);
    const entries = t.document.querySelectorAll('.entry');
    assert.strictEqual(entries.length, t.VOCAB_DATA[k].words.length, k);
    assert.deepStrictEqual([...t.document.querySelectorAll('.level-btn')].map(b => b.textContent), ['A', 'B', 'C']);
    assert.strictEqual(entries[0].querySelectorAll('.status-btn').length, 3);
    assert.ok(entries[0].querySelector('.dict-link').href.startsWith('https://www.oxfordlearnersdictionaries.com/search/english/?q='));
    assert.strictEqual(entries[0].querySelector('.entry-ex').textContent, t.VOCAB_DATA[k].words[0].ex);
  }

  // Level buttons live in the nav row, directly before the Random button
  { const d = (await load('topic.html?topic=0002')).document;
    const bar = d.getElementById('level-bar'), rnd = d.querySelector('nav [data-random-word]');
    assert.ok(bar.closest('nav') && bar.parentElement === rnd.parentElement, 'same row as Random');
    assert.strictEqual(bar.nextElementSibling, rnd);
    assert.ok(!d.querySelector('header .level-bar'), 'removed from header'); }

  // CEFR level groups (A = A1 + A2, B = B1 + B2, C = C1 + C2): switching + persistence + toggle off
  w = await load('topic.html?topic=0004');
  const first = w.VOCAB_DATA['0004'].words[0], set = w.VOCAB_EXAMPLES['0004'][first.w];
  const card = () => w.document.querySelector('.entry');
  const tags = () => [...card().querySelectorAll('.ex-lv')].map(e => e.textContent);
  w.document.querySelector('.level-btn[data-level="B"]').click();
  assert.deepStrictEqual(exTexts(card()), [set[2], set[3]]);
  assert.deepStrictEqual(tags(), ['B1', 'B2']);
  assert.match(w.document.getElementById('count').textContent, /B1 \+ B2 examples/);
  assert.strictEqual(store['vocab-level'], '"B"');
  w = await load('topic.html?topic=0004');                 // reload: level group persisted
  assert.ok(w.document.querySelector('.level-btn[data-level="B"]').classList.contains('active'));
  assert.deepStrictEqual(exTexts(card()), [set[2], set[3]]);
  w.document.querySelector('.level-btn[data-level="C"]').click();
  assert.deepStrictEqual(exTexts(card()), [set[4], set[5]]);
  assert.deepStrictEqual(tags(), ['C1', 'C2']);
  assert.ok(!w.document.querySelector('.level-btn[data-level="B"]').classList.contains('active'));
  w.document.querySelector('.level-btn[data-level="C"]').click(); // deselect -> original
  assert.deepStrictEqual(exTexts(card()), [first.ex]);
  assert.deepStrictEqual(tags(), []);
  assert.strictEqual(store['vocab-level'], 'null');

  // a single level saved before the merge (e.g. "B2") opens its group
  store['vocab-level'] = '"B2"';
  w = await load('topic.html?topic=0004');
  assert.ok(w.document.querySelector('.level-btn[data-level="B"]').classList.contains('active'));
  assert.deepStrictEqual(exTexts(card()), [set[2], set[3]]);
  w.document.querySelector('.level-btn[data-level="B"]').click(); // back to the original

  // search still works with a level group active
  w.document.querySelector('.level-btn[data-level="A"]').click();
  const s = w.document.getElementById('search'); s.value = 'cramped'; s.dispatchEvent(new w.Event('input'));
  assert.strictEqual(w.document.querySelectorAll('.entry').length, 1);
  assert.deepStrictEqual(exTexts(card()), w.VOCAB_EXAMPLES['0004']['cramped'].slice(0, 2));

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
    assert.strictEqual(w.VocabRandom.poolSize, 238);
    const all = Object.entries(w.VOCAB_DATA).flatMap(([k,t]) => t.words.map(it => ({k, t: t.title, it})));
    const seen = new Set(); let prev = null;
    for (let n = 0; n < 400; n++) {
      if (n === 0) btn.click(); else d.getElementById('rw-next').click();
      assert.ok(d.querySelector('.rw-backdrop').classList.contains('open'));
      const word = d.getElementById('rw-word').textContent;
      assert.notStrictEqual(word, prev, 'no immediate repeat'); prev = word;
      const e = all.find(x => x.it.w === word); assert.ok(e, 'word exists: ' + word);
      seen.add(e.k);
      assert.strictEqual(d.getElementById('rw-ipa').textContent, e.it.ipa);
      assert.strictEqual(d.getElementById('rw-pos').textContent, e.it.p);
      assert.strictEqual(d.getElementById('rw-uz').textContent, e.it.tr || e.it.def);
      const en = d.getElementById('rw-en');
      if (e.it.tr) assert.strictEqual(en.textContent, e.it.def);
      else assert.ok(en.querySelector('a').href.includes('oxfordlearnersdictionaries.com'));
      assert.strictEqual(d.getElementById('rw-ex').textContent, e.it.ex);
      assert.ok(d.getElementById('rw-topic').getAttribute('href') === 'topic.html?topic=' + e.k);
    }
    assert.strictEqual(seen.size, 10, 'words come from all topics');
    // Escape closes
    d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape' }));
    assert.ok(!d.querySelector('.rw-backdrop').classList.contains('open'));
  }
  // Respects the saved CEFR level group (and an old single level, mapped to its group)
  for (const saved of ['"B"', '"B2"']) {
    store['vocab-level'] = saved;
    w = await load('index.html');
    w.document.querySelector('[data-random-word]').click();
    const rw = w.document.getElementById('rw-word').textContent;
    const k = Object.keys(w.VOCAB_DATA).find(k => w.VOCAB_DATA[k].words.some(x => x.w === rw));
    assert.deepStrictEqual(exTexts(w.document.getElementById('rw-ex')), w.VOCAB_EXAMPLES[k][rw].slice(2, 4), saved);
    assert.strictEqual(w.document.getElementById('rw-ex-label').textContent, 'Example · B1 + B2');
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
    assert.deepStrictEqual(btns.map(b => b.textContent), ['Memorized', 'Weak', 'Need to Learn', '☆ Today']);
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
  store['vocab-level'] = '"B"';
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

  console.log('ALL TESTS PASSED');
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
