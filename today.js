// Today: words picked for daily review with the "☆ Today" button on the word cards (topic pages).
// The list is stored in localStorage "vocab-today" as word ids ("0004|cramped", Part 1: "p1:0001|self-sufficient"),
// the same ids as the learning status. On the main page the "★ Today" button (#today-open) opens the list,
// with Clear and Copy URL. A copied link (index.html?today=id~id~…) opens the same list on another device.
// Usage: load after data.js, data_part1.js, examples.js, examples_part1.js, irregular.js, synonyms.js, tr-loader.js.
(function(){
  const KEY = 'vocab-today';
  const LEVELS = ['A1','A2','B1','B2','C1','C2'];
  const GROUPS = { A: ['A1','A2'], B: ['B1','B2'], C: ['C1','C2'] };

  function getList(){
    try{ const v = JSON.parse(localStorage.getItem(KEY)); return Array.isArray(v) ? v.filter(x => typeof x === 'string') : []; }
    catch(e){ return []; }
  }
  function setList(list){ try{ localStorage.setItem(KEY, JSON.stringify(list)); }catch(e){} }
  window.VocabToday = { getList, setList };

  const openBtn = document.getElementById('today-open');
  if(!openBtn) return; // the list view is on the main page only

  // ----- Word lookup: id -> { part, topicKey, topicTitle, item, examples } -----
  const PARTS = [
    { part: '1', prefix: 'p1:', data: window.VOCAB_DATA_PART1 || {}, examples: window.VOCAB_EXAMPLES_PART1 || {} },
    { part: '2', prefix: '',    data: window.VOCAB_DATA || {},       examples: window.VOCAB_EXAMPLES || {} }
  ];
  const byId = {};
  PARTS.forEach(P => Object.keys(P.data).forEach(k => P.data[k].words.forEach(item => {
    byId[`${P.prefix}${k}|${item.w}`] = { part: P.part, topicKey: k, topicTitle: P.data[k].title, item, examples: P.examples };
  })));
  const known = list => list.filter((id, i) => byId[id] && list.indexOf(id) === i);

  // ----- Styles (uses the page's theme variables) -----
  const style = document.createElement('style');
  style.textContent = `
  .today-count{ font-size:11.5px; margin-left:4px; opacity:.85; }
  .td-backdrop{ position:fixed; inset:0; z-index:100; background:rgba(0,0,0,.55);
    display:none; align-items:center; justify-content:center; padding:20px; }
  .td-backdrop.open{ display:flex; }
  .td-card{ width:100%; max-width:720px; max-height:90vh; display:flex; flex-direction:column;
    background:var(--bg); color:var(--text); border:1px solid var(--line); border-radius:12px;
    box-shadow:0 20px 50px var(--shadow); }
  .td-head{ display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap;
    padding:18px 22px 14px; border-bottom:1px solid var(--line); }
  .td-title{ font-family:'Space Grotesk',sans-serif; font-size:22px; font-weight:600; margin:0; }
  .td-title .td-n{ font-family:'JetBrains Mono',monospace; font-size:13px; font-weight:400; color:var(--muted); margin-left:8px; }
  .td-tools{ display:flex; align-items:center; gap:8px; }
  .td-btn{ font-family:'JetBrains Mono',monospace; font-size:12.5px; color:var(--accent); background:none;
    border:1px solid var(--accent); border-radius:6px; padding:5px 12px; cursor:pointer; }
  .td-btn:hover{ background:var(--accent-dim); }
  .td-btn:disabled{ opacity:.4; cursor:default; background:none; }
  .td-close{ background:none; border:1px solid var(--line); border-radius:6px; color:var(--muted);
    width:30px; height:30px; cursor:pointer; font-size:16px; line-height:1; }
  .td-close:hover{ color:var(--text); border-color:var(--text); }
  .td-share{ padding:12px 22px; border-bottom:1px solid var(--line); font-size:13px; color:var(--muted); }
  .td-share input{ width:100%; box-sizing:border-box; font-family:'JetBrains Mono',monospace; font-size:12px;
    color:var(--text); background:none; border:1px solid var(--line); border-radius:6px; padding:6px 8px; margin-bottom:6px; }
  .td-list{ overflow:auto; padding:6px 22px 18px; }
  .td-empty{ color:var(--muted); text-align:center; padding:36px 0; font-size:14.5px; }
  .td-item{ padding:14px 0; border-bottom:1px dashed var(--line); }
  .td-item:last-child{ border-bottom:none; }
  .td-top{ display:flex; align-items:baseline; gap:10px; flex-wrap:wrap; margin-bottom:6px; }
  .td-word{ font-family:'Space Grotesk',sans-serif; font-size:19px; font-weight:600; color:var(--text); }
  .td-word:hover{ color:var(--accent); }
  .td-pos{ font-family:'JetBrains Mono',monospace; font-size:12px; color:var(--accent);
    border:1px solid var(--accent-dim); border-radius:4px; padding:1px 7px; }
  .td-ipa{ font-family:'JetBrains Mono',monospace; font-size:13px; color:var(--muted); }
  .td-forms{ font-size:13px; color:var(--muted); }
  .td-forms b{ font-weight:600; color:var(--text); }
  .td-forms .lbl{ font-style:normal; color:var(--accent); }
  [data-related="off"] .td-related{ display:none; }
  .td-remove{ margin-left:auto; background:none; border:1px solid var(--line); border-radius:6px; color:var(--muted);
    font-size:12px; padding:2px 8px; cursor:pointer; font-family:'JetBrains Mono',monospace; }
  .td-remove:hover{ color:var(--text); border-color:var(--text); }
  .td-en{ font-size:15px; margin-bottom:3px; }
  .td-uz{ font-size:14px; color:var(--accent); margin-bottom:6px; }
  .td-ex{ font-size:14px; color:var(--muted); font-style:italic; }
  .td-ex + .td-ex, .td-uzex + .td-ex{ margin-top:5px; }
  .td-ex .t::before{ content:"\\201C"; } .td-ex .t::after{ content:"\\201D"; }
  .td-ex .lv, .td-uzex .lbl{ font-family:'JetBrains Mono',monospace; font-style:normal; font-size:11px;
    border-radius:4px; padding:0 5px; margin-right:6px; }
  .td-ex .lv{ color:var(--muted); border:1px solid var(--line); }
  .td-uzex{ display:none; margin-top:3px; font-size:14px; }
  [data-translate="on"] .td-uzex{ display:block; }
  .td-uzex .lbl{ color:var(--accent); border:1px solid var(--accent-dim); }
  .td-src{ font-family:'JetBrains Mono',monospace; font-size:11.5px; color:var(--muted); margin-top:8px; }
  @media print{ .td-backdrop{ display:none !important; } }`;
  document.head.appendChild(style);

  // ----- Panel markup -----
  const backdrop = document.createElement('div');
  backdrop.className = 'td-backdrop';
  backdrop.innerHTML = `
    <div class="td-card" role="dialog" aria-modal="true" aria-labelledby="td-title">
      <div class="td-head">
        <h2 class="td-title" id="td-title">★ Today<span class="td-n" id="td-n"></span></h2>
        <div class="td-tools">
          <button class="td-btn" type="button" id="td-copy" title="Copy a link that opens this list on another device">⧉ Copy URL</button>
          <button class="td-btn" type="button" id="td-clear" title="Remove all words from the Today list">Clear</button>
          <button class="td-close" type="button" id="td-close" aria-label="Close">×</button>
        </div>
      </div>
      <div class="td-share" id="td-share" hidden>
        <input type="text" id="td-url" readonly aria-label="Link to this Today list">
        <div id="td-msg"></div>
      </div>
      <div class="td-list" id="td-list"></div>
    </div>`;
  document.body.appendChild(backdrop);
  const $ = id => backdrop.querySelector('#' + id);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));

  // Example sentences in the saved level group (A = A1 + A2, …), otherwise the original example.
  function examplesOf(e){
    let level = null;
    try{ level = JSON.parse(localStorage.getItem('vocab-level')); }catch(err){}
    if(LEVELS.includes(level)) level = level[0];
    const set = (e.examples[e.topicKey] || {})[e.item.w];
    const list = (GROUPS[level] && set) ? GROUPS[level].map(lv => ({ lv, en: set[LEVELS.indexOf(lv)] })).filter(x => x.en) : [];
    return list.length ? list : [{ lv: null, en: e.item.ex }];
  }

  function itemHTML(id){
    const e = byId[id], it = e.item;
    const vf = window.verbForms ? window.verbForms(it) : null;
    const rel = window.adjRelated ? window.adjRelated(it) : null;
    const relParts = rel ? [
      rel.syn.length ? `<i class="lbl">Synonyms:</i> <b>${rel.syn.join(', ')}</b>` : '',
      rel.ant.length ? `<i class="lbl">Opposites:</i> <b>${rel.ant.join(', ')}</b>` : ''
    ].filter(Boolean) : [];
    const uzAll = window.getTopicTranslations ? (window.getTopicTranslations(e.part, e.topicKey) || {}) : {};
    const exs = examplesOf(e).map(x => {
      if(!x.lv) return `<div class="td-ex">${x.en}</div>`;
      const uz = (uzAll[x.lv] || {})[it.w];
      return `<div class="td-ex"><i class="lv">${x.lv}</i><span class="t">${x.en}</span></div>` +
        (uz ? `<div class="td-uzex"><i class="lbl">UZ</i>${uz}</div>` : '');
    }).join('');
    const href = `topic.html?topic=${e.topicKey}${e.part === '1' ? '&part=1' : ''}&q=${encodeURIComponent(it.w)}`;
    return `<div class="td-item" data-id="${esc(id)}">
      <div class="td-top">
        <a class="td-word" href="${href}" title="Open in its topic">${it.w}</a>
        <span class="td-pos">${it.p}</span>
        <span class="td-ipa">${it.ipa}</span>
        ${vf ? `<span class="td-forms"><i class="lbl">Past:</i> <b>${vf.past}</b> · <i class="lbl">Past participle:</i> <b>${vf.participle}</b></span>` : ''}
        ${relParts.length ? `<span class="td-forms td-related">${relParts.join(' · ')}</span>` : ''}
        <button class="td-remove" type="button" title="Remove this word from Today">× Remove</button>
      </div>
      ${it.tr ? `<div class="td-en">${it.def}</div>` : ''}
      <div class="td-uz">${it.tr || it.def}</div>
      ${exs}
      <div class="td-src">Part ${e.part} · ${e.topicKey} · ${e.topicTitle}</div>
    </div>`;
  }

  function render(){
    const list = known(getList());
    $('td-n').textContent = `${list.length} word${list.length === 1 ? '' : 's'}`;
    $('td-copy').disabled = $('td-clear').disabled = !list.length;
    $('td-list').innerHTML = list.length ? list.map(itemHTML).join('')
      : '<div class="td-empty">No words yet. Open a topic and press <b>☆ Today</b> on a word to add it here.</div>';
  }

  // Load the Uzbek translations of the listed words' topics, then show them.
  function loadTranslations(){
    if(!window.loadTopicTranslations) return;
    const topics = {};
    known(getList()).forEach(id => { const e = byId[id]; topics[e.part + '/' + e.topicKey] = e; });
    Object.values(topics).forEach(e => {
      if(!window.getTopicTranslations(e.part, e.topicKey))
        window.loadTopicTranslations(e.part, e.topicKey).then(() => { if(backdrop.classList.contains('open')) render(); });
    });
  }

  function updateCount(){
    const n = known(getList()).length;
    let c = openBtn.querySelector('.today-count');
    if(!c){ c = document.createElement('span'); c.className = 'today-count'; openBtn.appendChild(c); }
    c.textContent = n ? `(${n})` : '';
  }

  let opener = null;
  function open(){
    $('td-share').hidden = true;
    render();
    loadTranslations();
    if(!backdrop.classList.contains('open')){
      opener = document.activeElement;
      backdrop.classList.add('open');
      $('td-close').focus();
    }
  }
  function close(){
    backdrop.classList.remove('open');
    if(opener && opener.focus) opener.focus();
  }

  // Link that opens this list: <this page>?today=id~id~…
  function shareUrl(){
    const ids = known(getList());
    return location.href.split(/[?#]/)[0] + '?today=' + ids.map(encodeURIComponent).join('~');
  }
  function copyText(text){
    if(navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise((resolve, reject) => {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta); ta.select();
      let ok = false;
      try{ ok = document.execCommand('copy'); }catch(e){}
      ta.remove();
      ok ? resolve() : reject();
    });
  }

  openBtn.addEventListener('click', open);
  $('td-close').addEventListener('click', close);
  backdrop.addEventListener('click', e => { if(e.target === backdrop) close(); });
  document.addEventListener('keydown', e => { if(e.key === 'Escape' && backdrop.classList.contains('open')) close(); });

  $('td-list').addEventListener('click', e => {
    const b = e.target.closest('.td-remove');
    if(!b) return;
    const id = b.closest('.td-item').dataset.id;
    setList(getList().filter(x => x !== id));
    render(); updateCount();
  });
  $('td-clear').addEventListener('click', () => {
    const n = known(getList()).length;
    if(!n || !confirm(`Remove all ${n} word${n === 1 ? '' : 's'} from the Today list?`)) return;
    setList([]);
    $('td-share').hidden = true;
    render(); updateCount();
  });
  $('td-copy').addEventListener('click', () => {
    const url = shareUrl(), input = $('td-url'), msg = $('td-msg');
    $('td-share').hidden = false;
    input.value = url;
    const note = location.protocol === 'file:' ? ' This page is opened from a file, so the link works only on this computer; copy it from the published website to use it on another device.' : '';
    copyText(url).then(() => { msg.textContent = 'Link copied. Open it on another device to see the same list.' + note; },
                       () => { input.select(); msg.textContent = 'Could not copy automatically — select the link above and copy it.' + note; });
  });

  // Keep the count right when the list changes in another tab or when coming back from a topic page.
  window.addEventListener('storage', e => { if(e.key === KEY){ updateCount(); if(backdrop.classList.contains('open')) render(); } });
  window.addEventListener('pageshow', updateCount);

  // ----- Opened from a shared link: ?today=id~id~… -----
  const params = new URLSearchParams(location.search);
  if(params.has('today')){
    const shared = known((params.get('today') || '').split('~').filter(Boolean));
    const mine = known(getList());
    if(shared.length && shared.join('~') !== mine.join('~')){
      if(!mine.length || confirm(`This link has a Today list of ${shared.length} word${shared.length === 1 ? '' : 's'}.\n\n` +
          `OK: replace your Today list (${mine.length} word${mine.length === 1 ? '' : 's'}) with it.\n` +
          `Cancel: add the shared words to your list.`)) setList(shared);
      else setList(mine.concat(shared.filter(id => !mine.includes(id))));
    }
    params.delete('today');
    const rest = params.toString();
    try{ history.replaceState(null, '', location.pathname + (rest ? '?' + rest : '') + location.hash); }catch(e){}
    updateCount();
    open();
  } else updateCount();
})();
